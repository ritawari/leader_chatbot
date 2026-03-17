"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Message, MessageType } from "@/lib/types";

function getTypeLabel(type: MessageType, colorValue: number): string {
  if (type === "deadline") {
    if (colorValue <= 0.33) return "⏰ Low urgency";
    if (colorValue <= 0.66) return "⏰ Medium urgency";
    return "⏰ High urgency";
  }
  if (type === "number") {
    if (colorValue <= 0.33) return "# Light shade";
    if (colorValue <= 0.66) return "# Mid shade";
    return "# Dark shade";
  }
  if (colorValue <= 0.2) return "Very sad";
  if (colorValue <= 0.4) return "Sad";
  if (colorValue <= 0.6) return "Neutral";
  if (colorValue <= 0.8) return "Happy";
  return "Very happy";
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mb-4" role="status" aria-label="Modi is typing">
      <div className="w-8 h-8 rounded-full bg-orange-700 flex items-center justify-center text-white text-xs font-bold shrink-0" aria-hidden="true">
        NM
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div
          className="max-w-[70%] rounded-2xl rounded-br-none px-4 py-3 bg-gray-800 text-white text-sm leading-relaxed"
          style={{ wordBreak: "break-word" }}
        >
          {msg.userText}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 mb-4">
      <div
        className="w-8 h-8 rounded-full bg-orange-700 flex items-center justify-center text-white text-xs font-bold shrink-0"
        aria-hidden="true"
      >
        NM
      </div>
      <div
        className="max-w-[70%] rounded-2xl rounded-bl-none px-4 py-3"
        style={{
          backgroundColor: msg.bgColor ?? "#f59e0b",
          color: msg.textColor ?? "#000000",
          wordBreak: "break-word",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
        }}
      >
        {msg.type != null && msg.colorValue != null && (
          <p
            className="text-xs font-semibold mb-1.5"
            aria-label={`Message type: ${getTypeLabel(msg.type, msg.colorValue)}`}
          >
            {getTypeLabel(msg.type, msg.colorValue)}
          </p>
        )}
        <p className="text-base leading-relaxed font-medium" lang="hi">
          {msg.hindiText}
        </p>
        <p
          className="text-sm mt-2 leading-relaxed border-t pt-2"
          style={{ borderColor: msg.textColor === "#ffffff" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)" }}
        >
          {msg.englishText}
        </p>
      </div>
    </div>
  );
}

type HistoryEntry = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<HistoryEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      userText: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: conversationHistory.slice(-6) }),
      });

      if (!res.ok) {
        throw new Error("Something went wrong. Please try again.");
      }
      const data = await res.json();

      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        userText: text,
        hindiText: data.hindiResponse,
        englishText: data.englishTranslation,
        bgColor: data.bgColor,
        textColor: data.textColor,
        type: data.type,
        colorValue: data.colorValue,
      };

      setMessages((prev) => [...prev, botMsg]);
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: data.hindiResponse },
      ]);
    } catch {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        userText: text,
        hindiText: "क्षमा करें, कुछ त्रुटि हो गई।",
        englishText: "Something went wrong. Please try again.",
        bgColor: "#dc2626",
        textColor: "#ffffff",
        type: "tone",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <a
        href="#chat-input"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-white focus:text-orange-700 focus:rounded-lg focus:shadow focus:outline-none"
      >
        Skip to input
      </a>
      {/* Header */}
      <header className="bg-orange-700 text-white px-4 py-3 shadow-md shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-orange-700 font-bold text-sm">
            NM
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-tight" lang="hi">मोदी चैटबॉट</h1>
            <p className="text-white text-xs">
              Modi Chatbot &mdash; Responds in Hindi with English translation
            </p>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-white hover:text-white border border-white/30 hover:border-white/60 rounded-lg px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-700"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Color legend */}
      <nav aria-label="Color coding guide" className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
          <span><span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1 align-middle" aria-hidden="true" />Blue = task ≥24h deadline</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1 align-middle" aria-hidden="true" />Yellow = 12h deadline</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-orange-600 mr-1 align-middle" aria-hidden="true" />Orange = &lt;2h deadline</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1 align-middle" aria-hidden="true" />White→Grey→Black = number</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1 align-middle" aria-hidden="true" />Red→White→Green = tone</span>
        </div>
      </nav>

      {/* Empty state — outside role="log" so it's accessible but doesn't pollute live region */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 select-none px-4">
          <p className="text-3xl mb-3" aria-hidden="true">🇮🇳</p>
          <p className="text-sm text-center">
            Type a task with a deadline, a number, or anything on your mind.
          </p>
          <p className="text-xs mt-1 text-gray-500 text-center">
            Press Enter to send &bull; Shift+Enter for new line
          </p>
        </div>
      )}

      {/* Message area */}
      <main
        className="flex-1 overflow-y-auto px-4 py-4"
        tabIndex={0}
        hidden={messages.length === 0 && !loading}
      >
        <div role="log" aria-label="Conversation" aria-live="polite">
          <div className="max-w-2xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        </div>
      </main>

      {/* Input area */}
      <footer className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <label htmlFor="chat-input" className="sr-only">
            Message Modi Chatbot
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a task + deadline, a number, or any message…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-400 px-4 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-700 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed leading-relaxed"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="shrink-0 w-10 h-10 rounded-xl bg-orange-700 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-orange-700 focus:ring-offset-2 hover:bg-orange-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
