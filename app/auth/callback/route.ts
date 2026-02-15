import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  const requestOrigin = new URL(request.url).origin;

  let baseUrl: string;
  if (envUrl && !envUrl.includes("localhost")) {
    baseUrl = envUrl;
  } else if (forwardedProto && forwardedHost) {
    baseUrl = `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, "");
  } else if (host && !host.includes("localhost")) {
    const proto = forwardedProto ?? "https";
    baseUrl = `${proto}://${host}`.replace(/\/+$/, "");
  } else {
    baseUrl = requestOrigin;
  }

  const path = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${path}`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_error`);
}
