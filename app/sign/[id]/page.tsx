import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SignView } from "./sign-view";
import type { AgreementStatus } from "@/lib/types/database";
import { kmsDecryptAgreementContent } from "@/lib/signing/kms-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) notFound();

  type AgreementForSign = {
    id: string;
    agreementVersionId: string;
    versionNumber: number;
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
    typeof raw.status === "string" &&
    typeof raw.agreement_version_id === "string"
  ) {
    const req = raw.required_signatures;
    const vn = raw.version_number;
    agreement = {
      id: raw.id,
      agreementVersionId: raw.agreement_version_id,
      versionNumber: typeof vn === "number" && vn >= 1 ? vn : 1,
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
        .select("id, status, required_signatures, current_version_id, title, content, content_hash")
        .eq("id", id)
        .in("status", ["pending", "signed"])
        .maybeSingle();
      if (result.data?.current_version_id) {
        const ver = await admin
          .from("agreement_versions")
          .select("id, version_number, title, content, content_hash, required_signatures, status")
          .eq("id", result.data.current_version_id as string)
          .maybeSingle();
        const d = result.data as Record<string, unknown>;
        const v = ver.data as Record<string, unknown> | null;
        if (v && typeof v.content === "string") {
          const req = v.required_signatures ?? d.required_signatures;
          agreement = {
            id: d.id as string,
            agreementVersionId: v.id as string,
            versionNumber: typeof v.version_number === "number" ? (v.version_number as number) : 1,
            title: (v.title as string) ?? (d.title as string),
            content: v.content as string,
            content_hash: v.content_hash as string,
            status: d.status as string,
            required_signatures: typeof req === "number" && req >= 1 ? req : 1,
          };
        }
      }
    } catch {
      agreement = null;
    }
  }

  if (!agreement) notFound();

  try {
    const admin = createAdminClient();
    const { data: verEnc } = await admin
      .from("agreement_versions")
      .select("is_encrypted, encrypted_content, encryption_kms_key_id")
      .eq("id", agreement.agreementVersionId)
      .maybeSingle();
    if (
      verEnc &&
      (verEnc as { is_encrypted?: boolean }).is_encrypted &&
      (verEnc as { encrypted_content?: string }).encrypted_content &&
      (verEnc as { encryption_kms_key_id?: string }).encryption_kms_key_id
    ) {
      const decrypted = await kmsDecryptAgreementContent(
        (verEnc as { encrypted_content: string }).encrypted_content
      );
      agreement = {
        ...agreement,
        content: decrypted.toString("utf8"),
      };
    }
  } catch {
    /* keep RPC content */
  }

  const supabase = await createClient();
  const { data: signaturesRaw } = await supabase
    .from("signatures")
    .select(
      "signer_id, signer_name, signed_at, annotation, signature_display, signature_style, slot_index, profiles(email)"
    )
    .eq("agreement_version_id", agreement.agreementVersionId)
    .order("signed_at", { ascending: true });

  const signatures =
    signaturesRaw?.map((s: any) => ({
      signer_id: s.signer_id,
      signer_name: s.signer_name,
      signed_at: s.signed_at,
      annotation: s.annotation,
      signature_display: s.signature_display,
      signature_style: s.signature_style,
      slot_index: typeof s.slot_index === "number" ? (s.slot_index as number) : null,
      signer_email: s.profiles?.email ?? null,
    })) ?? [];

  const passkeyRequired = process.env.NEXT_PUBLIC_AGREEMENT_PASSKEY_REQUIRED === "true";

  type AnchorRow = {
    chain_name: string;
    final_proof_hash: string;
    transaction_hash: string | null;
    block_number: number | null;
    anchored_at: string | null;
    anchor_status: string;
  };
  let anchor: AnchorRow | null = null;

  if (agreement.status === "signed") {
    try {
      const admin = createAdminClient();
      const { data: arow } = await admin
        .from("agreement_version_anchors")
        .select(
          "chain_name, final_proof_hash, transaction_hash, block_number, anchored_at, anchor_status"
        )
        .eq("agreement_version_id", agreement.agreementVersionId)
        .maybeSingle();
      if (arow) anchor = arow as AnchorRow;
    } catch {
      anchor = null;
    }
  }

  return (
    <SignView
      agreementId={agreement.id}
      agreementVersionId={agreement.agreementVersionId}
      versionNumber={agreement.versionNumber}
      title={agreement.title}
      content={agreement.content}
      contentHash={agreement.content_hash}
      status={agreement.status as AgreementStatus}
      signatures={signatures}
      requiredSignatures={agreement.required_signatures}
      passkeyRequired={passkeyRequired}
      anchor={anchor}
    />
  );
}
