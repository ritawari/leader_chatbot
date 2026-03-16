import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const email = req.cookies.get("auth_email")?.value;
  if (!email?.endsWith("@petasight.com")) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
