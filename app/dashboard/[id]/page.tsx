import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SharePanel } from "./share-panel";
import { ArrowLeft, FileText, Clock, CheckCircle, Trash2 } from "lucide-react";
import { deleteAgreement } from "@/app/actions/agreements";
import type { AgreementStatus } from "@/lib/types/database";
import { kmsDecryptAgreementContent } from "@/lib/signing/kms-client";

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

  const STATUS_BADGE: Record<AgreementStatus, { label: string; icon: typeof FileText; variant: "secondary" | "destructive" | "default" | "outline"; className?: string }> = {
    pending: { label: "Pending", icon: Clock, variant: "outline", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
    signed: { label: "Signed", icon: CheckCircle, variant: "default", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
    voided: { label: "Voided", icon: FileText, variant: "destructive" },
  };
  const statusConf = STATUS_BADGE[agreement.status as AgreementStatus];

  let signatures: { signer_id: string; signer_name: string; signed_at: string; annotation?: string | null; email?: string | null }[] = [];
  if (agreement.status === "signed") {
    const { data: sigs } = await supabase
      .from("signatures")
      .select("signer_id, signer_name, signed_at, annotation, profiles(email)")
      .eq("agreement_id", agreement.id)
      .order("signed_at", { ascending: true });
    signatures =
      sigs?.map((s: any) => ({
        signer_id: s.signer_id,
        signer_name: s.signer_name,
        signed_at: s.signed_at,
        annotation: s.annotation,
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-xl">{agreement.title}</CardTitle>
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
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-muted/30 p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
            </div>
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
            {agreement.status === "signed" && signatures.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium">Signatures</p>
                <ul className="space-y-2 text-sm">
                  {signatures.map((s, i) => (
                    <li
                      key={i}
                      className="border-b border-border/50 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-medium">
                        {s.signer_name}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({s.signer_id}
                          {s.email ? ` · ${s.email}` : ""})
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {new Date(s.signed_at).toLocaleString()}
                      </span>
                      {s.annotation != null && s.annotation.trim() !== "" && (
                        <p className="mt-1 text-muted-foreground">{s.annotation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
