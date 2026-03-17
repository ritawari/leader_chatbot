import { NextRequest, NextResponse } from "next/server";
import { verifySignedCookie, COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  const email = cookieValue ? await verifySignedCookie(cookieValue) : null;

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
