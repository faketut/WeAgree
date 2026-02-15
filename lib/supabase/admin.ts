import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with secret key. Bypasses RLS.
 * Use only in server components / server actions. Never expose to the client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, secretKey);
}
