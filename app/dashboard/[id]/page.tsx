import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SharePanel } from "./share-panel";
import { ArrowLeft, FileText, Clock, CheckCircle, Trash2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { deleteAgreement } from "@/app/actions/agreements";
import type { AgreementStatus } from "@/lib/types/database";
import { kmsDecryptAgreementContent } from "@/lib/signing/kms-client";
import { PDFDownloadButton } from "@/components/pdf-download-button";

function getBaseUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (siteUrl) return siteUrl;
  const h = headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export default async function AgreementSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: agreement, error } = await supabase
    .from("agreements")
    .select(
      "id, title, content, status, created_at, is_encrypted, encrypted_content, encryption_kms_key_id"
    )
    .eq("id", id)
    .eq("creator_id", user.id)
    .single();

  if (error || !agreement) notFound();

  let content = agreement.content as string;
  if (
    (agreement as any).is_encrypted &&
    (agreement as any).encrypted_content &&
    (agreement as any).encryption_kms_key_id
  ) {
    try {
      const decrypted = await kmsDecryptAgreementContent(
        (agreement as any).encrypted_content as string
      );
      content = decrypted.toString("utf8");
    } catch {
      // Fallback to stored plaintext if decryption fails.
      content = agreement.content as string;
    }
  }

  const baseUrl = getBaseUrl();
  const signUrl = `${baseUrl}/sign/${agreement.id}`;

  const STATUS_BADGE: Record<
    AgreementStatus,
    {
      label: string;
      icon: typeof FileText;
      variant: "secondary" | "destructive" | "default" | "outline";
      className?: string;
    }
  > = {
    draft: {
      label: "Draft",
      icon: FileText,
      variant: "secondary",
    },
    pending: {
      label: "Pending",
      icon: Clock,
      variant: "outline",
      className:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    },
    signed: {
      label: "Signed",
      icon: CheckCircle,
      variant: "default",
      className:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    },
    voided: {
      label: "Voided",
      icon: FileText,
      variant: "destructive",
    },
  };
  const statusConf = STATUS_BADGE[agreement.status as AgreementStatus];

  let signatures: {
    signer_id: string;
    signer_name: string;
    signed_at: string;
    annotation?: string | null;
    email?: string | null;
    signature_display?: string | null;
    signature_style?: string | null;
  }[] = [];
  if (agreement.status === "signed") {
    const { data: sigs } = await supabase
      .from("signatures")
      .select("signer_id, signer_name, signed_at, annotation, signature_display, signature_style, profiles(email)")
      .eq("agreement_id", agreement.id)
      .order("signed_at", { ascending: true });
    signatures =
      sigs?.map((s: any) => ({
        signer_id: s.signer_id,
        signer_name: s.signer_name,
        signed_at: s.signed_at,
        annotation: s.annotation,
        signature_display: s.signature_display,
        signature_style: s.signature_style,
        email: s.profiles?.email ?? null,
      })) ?? [];
  }

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <Card>
          <CardHeader className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">{agreement.title}</CardTitle>
                <PDFDownloadButton
                  contentId="agreement-printable-area"
                  filename={agreement.title.replace(/\s+/g, "_")}
                  title={agreement.title}
                />
              </div>
              {statusConf && (() => {
                const Icon = statusConf.icon;
                return (
                  <Badge variant={statusConf.variant} className={statusConf.className}>
                    <Icon className="mr-1 h-3 w-3" />
                    {statusConf.label}
                  </Badge>
                );
              })()}
            </div>
            <CardDescription>
              Created {new Date(agreement.created_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6" id="agreement-printable-area">
            <div className="round-lg border bg-muted/30 p-4">
              <MarkdownRenderer content={content} />
            </div>
            {agreement.status === "signed" && signatures.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium">Signatures</p>
                <ul className="space-y-2 text-sm">
                  {signatures.map((s, i) => (
                    <li
                      key={i}
                      className="border-b border-border/50 pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-col gap-1">
                        {s.signature_display?.startsWith("data:image/") ? (
                          <img
                            src={s.signature_display}
                            alt={`Signature by ${s.signer_name}`}
                            className="h-12 w-auto object-contain self-start dark:invert"
                          />
                        ) : (
                          <span
                            className={
                              s.signature_style === "bold"
                                ? "font-bold tracking-wide"
                                : s.signature_style === "simple"
                                  ? "font-medium"
                                  : "italic font-semibold"
                            }
                          >
                            {s.signature_display || s.signer_name}
                          </span>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {s.signer_name}{" "}
                            <span className="text-xs font-normal text-muted-foreground font-mono">
                              ({s.signer_id.substring(0, 8)}...
                              {s.email ? ` · ${s.email}` : ""})
                            </span>
                          </span>
                          <span>— {new Date(s.signed_at).toLocaleString()}</span>
                        </div>
                      </div>
                      {s.annotation != null && s.annotation.trim() !== "" && (
                        <p className="mt-1 text-muted-foreground">{s.annotation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <CardContent className="pt-0 space-y-4">
            {agreement.status === "pending" && (
              <SharePanel signUrl={signUrl} agreementId={agreement.id} />
            )}
            {agreement.status === "pending" && (
              <form
                action={async () => {
                  "use server";
                  await deleteAgreement(agreement.id);
                }}
              >
                <Button
                  type="submit"
                  variant="destructive"
                  className="mt-2"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete pending agreement
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
