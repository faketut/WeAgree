import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SignView } from "./sign-view";
import type { AgreementStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Signers may only view pending or signed agreements (never draft/voided). Agreement content
// is idempotent: once published, title/content/content_hash are immutable (DB trigger).
// Each request fetches the latest agreement + signatures so every signer sees the latest signed agreement.
export default async function SignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) notFound();

  type AgreementForSign = {
    id: string;
    title: string;
    content: string;
    content_hash: string;
    status: string;
    required_signatures: number;
  };

  let agreement: AgreementForSign | null = null;

  const supabaseServer = await createClient();

  const rpc = await supabaseServer.rpc("get_agreement_for_signing", { p_id: id }).maybeSingle();
  const raw = rpc.data as Record<string, unknown> | null | undefined;
  if (
    raw &&
    typeof raw.id === "string" &&
    typeof raw.title === "string" &&
    typeof raw.content === "string" &&
    typeof raw.content_hash === "string" &&
    typeof raw.status === "string"
  ) {
    const req = raw.required_signatures;
    agreement = {
      id: raw.id,
      title: raw.title,
      content: raw.content,
      content_hash: raw.content_hash,
      status: raw.status,
      required_signatures: typeof req === "number" && req >= 1 ? req : 1,
    };
  }

  if (!agreement) {
    try {
      const admin = createAdminClient();
      const result = await admin
        .from("agreements")
        .select("id, title, content, content_hash, status, required_signatures")
        .eq("id", id)
        .in("status", ["pending", "signed"])
        .maybeSingle();
      if (result.data) {
        const d = result.data as Record<string, unknown>;
        const req = d.required_signatures;
        agreement = {
          id: d.id as string,
          title: d.title as string,
          content: d.content as string,
          content_hash: d.content_hash as string,
          status: d.status as string,
          required_signatures:
            typeof req === "number" && req >= 1 ? req : 1,
        };
      }
    } catch {
      agreement = null;
    }
  }

  // Only pending and signed are returned by RPC and admin fallback; draft/voided => notFound
  if (!agreement) notFound();

  const supabase = await createClient();
  const { data: signaturesRaw } = await supabase
    .from("signatures")
    .select("signer_id, signer_name, signed_at, annotation, signature_display, signature_style, profiles(email)")
    .eq("agreement_id", agreement.id)
    .order("signed_at", { ascending: true });

  const signatures =
    signaturesRaw?.map((s: any) => ({
      signer_id: s.signer_id,
      signer_name: s.signer_name,
      signed_at: s.signed_at,
      annotation: s.annotation,
      signature_display: s.signature_display,
      signature_style: s.signature_style,
      signer_email: s.profiles?.email ?? null,
    })) ?? [];

  return (
    <SignView
      agreementId={agreement.id}
      title={agreement.title}
      content={agreement.content}
      contentHash={agreement.content_hash}
      status={agreement.status as AgreementStatus}
      signatures={signatures}
      requiredSignatures={agreement.required_signatures}
    />
  );
}
