/**
 * API route tests — groq-sdk is mocked; no real LLM calls are made.
 *
 * The groq-sdk mock stores the `create` jest.fn() as a static property
 * on the mock class so tests can set up return values and inspect calls
 * without hoisting issues.
 */

// Mock groq-sdk BEFORE importing anything that pulls in route.ts
jest.mock("groq-sdk", () => {
  const createFn = jest.fn();
  return {
    __esModule: true,
    default: class MockGroq {
      static _create = createFn;
      chat = { completions: { create: createFn } };
    },
  };
});

import { NextRequest } from "next/server";
import { POST } from "./route";
import Groq from "groq-sdk";

const mockCreate = (Groq as unknown as { _create: jest.Mock })._create;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeReq(body: object, ip = "10.0.0.1", authed = true): NextRequest {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      ...(authed ? { Cookie: "auth_email=test@petasight.com" } : {}),
    },
    body: JSON.stringify(body),
  });
}

function llmResponse(payload: object) {
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  });
}

beforeEach(() => {
  mockCreate.mockReset();
});

// ---------------------------------------------------------------------------
// Requirement: Auth guardrail — @petasight.com cookie required
// ---------------------------------------------------------------------------
describe("Auth guardrail", () => {
  test("missing auth_email cookie → 401", async () => {
    const res = await POST(makeReq({ message: "hello" }, "10.0.0.1", false));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  test("non-petasight email cookie → 401", async () => {
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.1",
        Cookie: "auth_email=attacker@evil.com",
      },
      body: JSON.stringify({ message: "hello" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test("valid @petasight.com cookie → request proceeds normally", async () => {
    llmResponse({ type: "tone", colorValue: 0.5, hindiResponse: "नमस्ते", englishTranslation: "Hello" });
    const res = await POST(makeReq({ message: "hello" }, "10.0.0.99", true));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Requirement: Input validation
// ---------------------------------------------------------------------------
describe("Input validation", () => {
  test("missing message field → 400", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid message/i);
  });

  test("non-string message → 400", async () => {
    const res = await POST(makeReq({ message: 123 }));
    expect(res.status).toBe(400);
  });

  test("message exactly 2000 chars → 200 (boundary accepted)", async () => {
    llmResponse({ type: "tone", colorValue: 0.5, hindiResponse: "नमस्ते", englishTranslation: "Hello" });
    const res = await POST(makeReq({ message: "a".repeat(2000) }, "10.0.0.2"));
    expect(res.status).toBe(200);
  });

  test("message 2001 chars → 400 with descriptive error", async () => {
    const res = await POST(makeReq({ message: "a".repeat(2001) }, "10.0.0.3"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/too long/i);
    expect(body.error).toMatch(/2000/);
  });
});

// ---------------------------------------------------------------------------
// Requirement: Rate limiting — 20 req/min per IP
// ---------------------------------------------------------------------------
describe("Rate limiting", () => {
  test("20th request succeeds, 21st from same IP → 429", async () => {
    const ip = `rl-test-${Date.now()}`;
    for (let i = 0; i < 20; i++) {
      llmResponse({ type: "tone", colorValue: 0.5, hindiResponse: "नमस्ते", englishTranslation: "Hello" });
      const res = await POST(makeReq({ message: "hello" }, ip));
      expect(res.status).toBe(200);
    }
    const res21 = await POST(makeReq({ message: "hello" }, ip));
    expect(res21.status).toBe(429);
    const body = await res21.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  test("different IPs are rate-limited independently", async () => {
    const ip = `rl-indep-${Date.now()}`;
    llmResponse({ type: "tone", colorValue: 0.5, hindiResponse: "नमस्ते", englishTranslation: "Hello" });
    const res = await POST(makeReq({ message: "hello" }, `${ip}-b`));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Requirement: Deadline type — Blue (>=24h) → Deep Orange (<2h)
// ---------------------------------------------------------------------------
describe("Deadline classification", () => {
  test("hoursRemaining=30 → colorValue=0.0, bgColor=#1d4ed8 (blue)", async () => {
    llmResponse({ type: "deadline", colorValue: 0, hoursRemaining: 30, hindiResponse: "समझ गया", englishTranslation: "Understood" });
    const res = await POST(makeReq({ message: "finish report by tomorrow 6pm" }, "10.0.1.1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("deadline");
    expect(body.colorValue).toBe(0);
    expect(body.bgColor).toBe("#1d4ed8");
    expect(body.textColor).toBe("#ffffff");
  });

  test("hoursRemaining=1 → colorValue=1.0, bgColor=#ea580c (deep orange)", async () => {
    llmResponse({ type: "deadline", colorValue: 0, hoursRemaining: 1, hindiResponse: "जल्दी करो", englishTranslation: "Hurry up" });
    const res = await POST(makeReq({ message: "submit in 1 hour" }, "10.0.1.2"));
    const body = await res.json();
    expect(body.colorValue).toBe(1.0);
    expect(body.bgColor).toBe("#ea580c");
    expect(body.textColor).toBe("#000000");
  });

  test("hoursRemaining=12 → colorValue=0.5, bgColor=#eab308 (yellow)", async () => {
    llmResponse({ type: "deadline", colorValue: 0, hoursRemaining: 12, hindiResponse: "ध्यान दो", englishTranslation: "Pay attention" });
    const res = await POST(makeReq({ message: "done by tonight midnight" }, "10.0.1.3"));
    const body = await res.json();
    expect(body.colorValue).toBe(0.5);
    expect(body.bgColor).toBe("#eab308");
  });

  test("deadline response includes hindi and english", async () => {
    llmResponse({ type: "deadline", colorValue: 0, hoursRemaining: 24, hindiResponse: "मेरे प्रिय देशवासियो", englishTranslation: "My dear countrymen" });
    const res = await POST(makeReq({ message: "task by tomorrow" }, "10.0.1.4"));
    const body = await res.json();
    expect(body.hindiResponse).toBeTruthy();
    expect(body.englishTranslation).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Requirement: Number type — last 2 digits determine white→grey→black
// ---------------------------------------------------------------------------
describe("Number classification", () => {
  test("numberValue=9900 → last-2-digits=00 → colorValue=0.0 (white)", async () => {
    llmResponse({ type: "number", colorValue: 0, numberValue: 9900, hindiResponse: "शून्य", englishTranslation: "Zero" });
    const res = await POST(makeReq({ message: "9900" }, "10.0.2.1"));
    const body = await res.json();
    expect(body.type).toBe("number");
    expect(body.colorValue).toBe(0);
    expect(body.bgColor).toBe("#ffffff");
  });

  test("numberValue=1950 → last-2-digits=50 → colorValue=0.5 (grey)", async () => {
    llmResponse({ type: "number", colorValue: 0, numberValue: 1950, hindiResponse: "पचास", englishTranslation: "Fifty" });
    const res = await POST(makeReq({ message: "1950" }, "10.0.2.2"));
    const body = await res.json();
    expect(body.colorValue).toBe(0.5);
    expect(body.bgColor).toBe("#6b7280");
  });

  test("numberValue=100 → special case → colorValue=1.0 (black)", async () => {
    llmResponse({ type: "number", colorValue: 0, numberValue: 100, hindiResponse: "सौ", englishTranslation: "One hundred" });
    const res = await POST(makeReq({ message: "100" }, "10.0.2.3"));
    const body = await res.json();
    expect(body.colorValue).toBe(1.0);
    expect(body.bgColor).toBe("#000000");
    expect(body.textColor).toBe("#ffffff");
  });

  test("numberValue=42 → last-2-digits=42 → colorValue=0.42", async () => {
    llmResponse({ type: "number", colorValue: 0, numberValue: 42, hindiResponse: "बयालीस", englishTranslation: "Forty-two" });
    const res = await POST(makeReq({ message: "42" }, "10.0.2.4"));
    const body = await res.json();
    expect(body.colorValue).toBeCloseTo(0.42);
  });

  test("missing numberValue → colorValue=0 (white) as safe default", async () => {
    llmResponse({ type: "number", colorValue: 0, hindiResponse: "संख्या", englishTranslation: "Number" });
    const res = await POST(makeReq({ message: "some number" }, "10.0.2.5"));
    const body = await res.json();
    expect(body.colorValue).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Requirement: Tone type — red (sad) → white (neutral) → green (happy)
// ---------------------------------------------------------------------------
describe("Tone classification", () => {
  test("colorValue=0.0 (very sad) → red bg, white text", async () => {
    llmResponse({ type: "tone", colorValue: 0.0, hindiResponse: "दुख है", englishTranslation: "There is sorrow" });
    const res = await POST(makeReq({ message: "my father passed away" }, "10.0.3.1"));
    const body = await res.json();
    expect(body.type).toBe("tone");
    expect(body.bgColor).toBe("#dc2626");
    expect(body.textColor).toBe("#ffffff");
  });

  test("colorValue=0.5 (neutral) → white bg, black text", async () => {
    llmResponse({ type: "tone", colorValue: 0.5, hindiResponse: "ठीक है", englishTranslation: "Alright" });
    const res = await POST(makeReq({ message: "what is the capital of India?" }, "10.0.3.2"));
    const body = await res.json();
    expect(body.bgColor).toBe("#ffffff");
    expect(body.textColor).toBe("#000000");
  });

  test("colorValue=1.0 (very happy) → green bg, white text", async () => {
    llmResponse({ type: "tone", colorValue: 1.0, hindiResponse: "बधाई हो", englishTranslation: "Congratulations" });
    const res = await POST(makeReq({ message: "I just got promoted!" }, "10.0.3.3"));
    const body = await res.json();
    expect(body.bgColor).toBe("#16a34a");
    expect(body.textColor).toBe("#000000");
  });

  test("colorValue is clamped to [0,1]", async () => {
    llmResponse({ type: "tone", colorValue: 1.8, hindiResponse: "खुशी", englishTranslation: "Joy" });
    const res = await POST(makeReq({ message: "fantastic news!" }, "10.0.3.4"));
    const body = await res.json();
    expect(body.colorValue).toBe(1.0);
  });

  test("colorValue=-0.5 is clamped to 0", async () => {
    llmResponse({ type: "tone", colorValue: -0.5, hindiResponse: "दुख", englishTranslation: "Sadness" });
    const res = await POST(makeReq({ message: "terrible day" }, "10.0.3.5"));
    const body = await res.json();
    expect(body.colorValue).toBe(0.0);
  });
});

// ---------------------------------------------------------------------------
// Requirement: Response always in Hindi (non-Latin) + English translation
// ---------------------------------------------------------------------------
describe("Response format", () => {
  test("response always has non-empty hindiResponse and englishTranslation", async () => {
    llmResponse({ type: "tone", colorValue: 0.5, hindiResponse: "मेरे प्रिय देशवासियो", englishTranslation: "My dear countrymen" });
    const res = await POST(makeReq({ message: "hello" }, "10.0.4.1"));
    const body = await res.json();
    expect(body.hindiResponse).toBeTruthy();
    expect(body.englishTranslation).toBeTruthy();
  });

  test("response always includes bgColor and textColor", async () => {
    llmResponse({ type: "tone", colorValue: 0.5, hindiResponse: "नमस्ते", englishTranslation: "Hello" });
    const res = await POST(makeReq({ message: "hi" }, "10.0.4.2"));
    const body = await res.json();
    expect(body.bgColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(body.textColor).toMatch(/^#(000000|ffffff)$/i);
  });
});

// ---------------------------------------------------------------------------
// Requirement: Robustness — malformed LLM JSON and invalid type handling
// ---------------------------------------------------------------------------
describe("Robustness", () => {
  test("malformed LLM JSON → 200 with Hindi fallback (not a 500)", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "{ broken json <<" } }],
    });
    const res = await POST(makeReq({ message: "hello" }, "10.0.5.1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hindiResponse).toBeTruthy();
    expect(body.type).toBe("tone");
  });

  test("unknown LLM type → falls back to tone classification", async () => {
    llmResponse({ type: "xyz_unknown", colorValue: 0.5, hindiResponse: "नमस्ते", englishTranslation: "Hello" });
    const res = await POST(makeReq({ message: "some message" }, "10.0.5.2"));
    const body = await res.json();
    expect(body.type).toBe("tone");
  });

  test("Groq API error → 500 with error field", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Groq network error"));
    const res = await POST(makeReq({ message: "hello" }, "10.0.5.3"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
