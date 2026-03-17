"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@petasight.com")) {
      setError("Access is restricted to @petasight.com email addresses.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed. Please try again.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-orange-700 flex items-center justify-center text-white font-bold text-lg mb-4">
            NM
          </div>
          <h1 className="text-xl font-bold text-gray-900" lang="hi">मोदी चैटबॉट</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in with your Petasight email</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-8 flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@petasight.com"
              disabled={loading}
              required
              aria-describedby={error ? "login-error" : undefined}
              aria-invalid={error ? "true" : undefined}
              className="rounded-xl border border-gray-400 px-4 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-700 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {error && (
            <p
              id="login-error"
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!email.trim() || loading}
            className="rounded-xl bg-orange-700 text-white font-semibold text-sm py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-700 focus:ring-offset-2 hover:bg-orange-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Only @petasight.com addresses are permitted.
        </p>
      </div>
    </div>
  );
}
