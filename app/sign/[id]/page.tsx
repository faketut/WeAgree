import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SignView } from "./sign-view";
import type { AgreementStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";

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
    agreement = {
      id: raw.id,
      title: raw.title,
      content: raw.content,
      content_hash: raw.content_hash,
      status: raw.status,
    };
  }

  if (!agreement) {
    try {
      const admin = createAdminClient();
      const result = await admin
        .from("agreements")
        .select("id, title, content, content_hash, status")
        .eq("id", id)
        .in("status", ["pending", "signed"])
        .maybeSingle();
      if (result.data) agreement = result.data;
    } catch {
      agreement = null;
    }
  }

  if (!agreement) notFound();

  const supabase = await createClient();
  const { data: signatures } = await supabase
    .from("signatures")
    .select("signer_id, signer_name, signed_at")
    .eq("agreement_id", agreement.id)
    .order("signed_at", { ascending: true });

  return (
    <SignView
      agreementId={agreement.id}
      title={agreement.title}
      content={agreement.content}
      contentHash={agreement.content_hash}
      status={agreement.status as AgreementStatus}
      signatures={signatures ?? []}
    />
  );
}
