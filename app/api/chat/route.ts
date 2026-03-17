import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getBubbleColor, wcagTextColor } from "@/lib/colors";
import { ChatApiResponse, MessageType } from "@/lib/types";
import { verifySignedCookie, COOKIE_NAME } from "@/lib/auth";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (rateLimitMap.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) return true;
  rateLimitMap.set(ip, [...recent, now]);
  return false;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function computeNumberColorValue(value: number): number {
  if (value === 100) return 1.0;
  return (value % 100) / 100;
}

function computeDeadlineColorValue(hoursRemaining: number): number {
  if (hoursRemaining >= 24) return 0.0;
  if (hoursRemaining <= 2) return 1.0;
  if (hoursRemaining >= 12) return 0.5 * (24 - hoursRemaining) / 12;
  return 0.5 + 0.5 * (12 - hoursRemaining) / 10;
}

const SYSTEM_PROMPT = (now: string) => `You are Narendra Modi, Prime Minister of India, responding to citizens through a special chatbot.

The current date and time is: ${now}

You MUST respond with valid JSON only — no markdown, no explanation outside the JSON object.

RESPONSE FORMAT (always this exact shape):
{
  "type": "deadline" | "number" | "tone",
  "colorValue": 0,
  "hoursRemaining": <number, only for deadline type>,
  "numberValue": <integer, only for number type — the actual number the user entered>,
  "hindiResponse": "<your response in Hindi Devanagari script>",
  "englishTranslation": "<exact English translation of the Hindi response>"
}

CLASSIFICATION PRIORITY — follow in this exact order:

RULE 1 — DEADLINE (check this FIRST, takes highest priority)
If the message contains ANY action/task/activity AND any time reference (e.g. "by 4am", "tomorrow", "in 2 hours", "at 3pm", "next week", "tonight", "this evening"):
  - type: "deadline" — even if the message contains numbers like "4am" or "3pm"
  - NEVER classify a message with a time reference as "number"
  - colorValue: set to 0 (the server computes the actual color)
  - hoursRemaining: calculate the EXACT number of hours from NOW to the deadline.
      Use the current date/time provided above as your reference.
      Examples (assuming current time is 2026-03-16T14:00:00):
        "by tomorrow 3pm"    → hoursRemaining = 25
        "in 2 hours"         → hoursRemaining = 2
        "by next week Monday"→ hoursRemaining = 168
        "tonight at 8pm"     → hoursRemaining = 6
        "by end of day"      → hoursRemaining = 10
        "in 30 minutes"      → hoursRemaining = 0.5
  - Acknowledge the task and deadline with encouragement in Modi's voice.

RULE 2 — NUMBER (only if no task/time context exists)
If the message is ONLY a bare number with no action verb and no time-of-day reference (e.g. "42", "7831", "my lucky number is 9900"):
  - type: "number"
  - colorValue: set to 0 (the server computes the actual color from the number)
  - numberValue: the integer value of the number the user entered (e.g. if user says "my lucky number is 9900", set numberValue: 9900)
  - hoursRemaining: omit this field
  - Respond with a philosophical or patriotic observation about that number.

RULE 3 — TONE (default for everything else)
Analyze the emotional tone:
  - type: "tone"
  - colorValue scale (be precise):
      0.0  = devastating / deeply negative (death, suicide, major disaster)
      0.1  = very sad (job loss, serious illness, major failure, grief)
      0.25 = somewhat sad (disappointment, minor setback, frustration)
      0.5  = neutral / informational (no clear emotion, just facts or questions)
      0.75 = somewhat happy / positive (good news, optimism, relief)
      0.9  = very happy (celebration, great achievement, joy)
      1.0  = extremely joyful / ecstatic (winning, life-changing good news)
  - hoursRemaining: omit this field
  - Respond with empathy, wisdom, or celebration matching the tone.

PERSONA RULES:
- You ARE Narendra Modi. Write with conviction, warmth, and national pride.
- Begin with "मेरे प्रिय देशवासियो," or a contextually appropriate Hindi salutation.
- Keep responses to 2-3 sentences in Hindi. The englishTranslation must be faithful and complete.
- Never break character. Write hindiResponse entirely in Devanagari script (no romanization).
- The englishTranslation must be a direct translation of hindiResponse, not a paraphrase.`;

export async function POST(req: NextRequest) {
  try {
    const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
    const authEmail = cookieValue ? await verifySignedCookie(cookieValue) : null;
    if (!authEmail?.endsWith("@petasight.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== "string") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { message, history } = body;
    if (!message.trim()) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` },
        { status: 400 }
      );
    }

    type HistoryEntry = { role: "user" | "assistant"; content: string };
    const safeHistory: HistoryEntry[] = Array.isArray(history)
      ? history
          .filter(
            (h): h is HistoryEntry =>
              h != null &&
              (h.role === "user" || h.role === "assistant") &&
              typeof h.content === "string"
          )
          .slice(-6)
      : [];

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT(new Date().toISOString()) },
        ...safeHistory,
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }, { timeout: 30_000 });

    if (!completion.choices?.length) throw new Error("Empty response from LLM");
    const raw = completion.choices[0].message.content ?? "{}";
    type LLMResponse = Partial<ChatApiResponse> & { numberValue?: number; hoursRemaining?: number };
    let parsed: LLMResponse;
    try {
      parsed = JSON.parse(raw) as LLMResponse;
    } catch {
      console.error("LLM returned malformed JSON:", raw);
      const fallbackBg = getBubbleColor("tone", 0.5);
      return NextResponse.json({
        type: "tone",
        colorValue: 0.5,
        bgColor: fallbackBg,
        textColor: wcagTextColor(fallbackBg),
        hindiResponse: "क्षमा करें, मेरी प्रतिक्रिया में तकनीकी समस्या आ गई।",
        englishTranslation: "Apologies, a technical issue occurred with my response. Please try again.",
      });
    }

    const type: MessageType =
      parsed.type === "deadline" || parsed.type === "number" || parsed.type === "tone"
        ? parsed.type
        : "tone";

    let colorValue: number;
    if (type === "number") {
      colorValue = computeNumberColorValue(typeof parsed.numberValue === "number" ? parsed.numberValue : 0);
    } else if (type === "deadline" && typeof parsed.hoursRemaining === "number") {
      colorValue = computeDeadlineColorValue(parsed.hoursRemaining);
    } else {
      colorValue = typeof parsed.colorValue === "number"
        ? Math.max(0, Math.min(1, parsed.colorValue))
        : 0.5;
    }

    const bgColor = getBubbleColor(type, colorValue);
    const textColor = wcagTextColor(bgColor);

    return NextResponse.json({
      type,
      colorValue,
      bgColor,
      textColor,
      hindiResponse: parsed.hindiResponse ?? "",
      englishTranslation: parsed.englishTranslation ?? "",
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
