import { NextRequest, NextResponse } from "next/server";

const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));

  if (typeof email !== "string" || !email.endsWith("@petasight.com")) {
    return NextResponse.json(
      { error: "Access restricted to @petasight.com email addresses." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth_email", email.trim().toLowerCase(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
