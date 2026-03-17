import { NextRequest, NextResponse } from "next/server";
import { signEmail, COOKIE_NAME } from "@/lib/auth";

const COOKIE_MAX_AGE = 60 * 60 * 8;

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));

  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@petasight\.com$/.test(normalized)) {
    return NextResponse.json(
      { error: "Access restricted to @petasight.com email addresses." },
      { status: 401 }
    );
  }

  const cookieValue = await signEmail(normalized);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
