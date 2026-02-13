import { NextRequest, NextResponse } from "next/server";
import { AUTHING_SESSION_COOKIE } from "@/lib/auth/session";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, redirectTo } = body;
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid token" },
        { status: 400 }
      );
    }
    const safeRedirect =
      redirectTo && typeof redirectTo === "string" && redirectTo.startsWith("/")
        ? redirectTo
        : "/dashboard";

    const response = NextResponse.json({ ok: true, redirectTo: safeRedirect });
    response.cookies.set(AUTHING_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
