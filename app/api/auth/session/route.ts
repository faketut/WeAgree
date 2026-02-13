import { NextRequest, NextResponse } from "next/server";

const AUTHING_SESSION_COOKIE = "authing_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * POST: Set Authing session cookie after WeChat scan login.
 * Body: { token: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : null;
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTHING_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * DELETE: Clear Authing session (logout).
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTHING_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
