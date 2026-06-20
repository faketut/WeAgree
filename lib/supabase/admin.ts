import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with secret key. Bypasses RLS.
 * Use only in server components / server actions. Never expose to the client.
 *
 * Cached across calls within a single Node process — `createClient` is
 * non-trivial and hot routes (proof export, sign page) used to construct it
 * several times per request.
 */
let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = raw ? raw.replace(/\/+$/, "") : "";
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)"
    );
  }
  cached = createClient(url, secretKey);
  return cached;
}
