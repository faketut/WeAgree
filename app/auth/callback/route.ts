import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ensureProfile, ensureUserKeypair } from "@/lib/account/provision";
import { getBaseUrlFromHeaders } from "@/lib/utils/baseUrl";
import { safeRelativePath } from "@/lib/utils/safeRedirect";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const baseUrl = getBaseUrlFromHeaders(request.headers, new URL(request.url).origin);
  const path = safeRelativePath(searchParams.get("redirectTo"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await ensureProfile(supabase, user);
          await ensureUserKeypair(supabase, user.id);
        }
      } catch {
        // Best-effort provisioning
      }
      return NextResponse.redirect(`${baseUrl}${path}`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_error`);
}
