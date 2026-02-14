import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SignView } from "./sign-view";

export default async function SignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) notFound();

  const supabase = await createClient();

  const { data: agreement, error } = await supabase
    .from("agreements")
    .select("id, title, content, content_hash, status")
    .eq("id", id)
    .single();

  if (error || !agreement) notFound();
  if (agreement.status === "draft" || agreement.status === "voided") {
    notFound();
  }

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
      status={agreement.status}
      signatures={signatures ?? []}
    />
  );
}
