import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SharePanel } from "./share-panel";
import { DraftActions } from "./draft-actions";
import { ArrowLeft } from "lucide-react";

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
    .select("id, title, content, status, created_at")
    .eq("id", id)
    .eq("creator_id", user.id)
    .single();

  if (error || !agreement) notFound();

  const baseUrl = getBaseUrl();
  const signUrl = `${baseUrl}/sign/${agreement.id}`;

  let signatures: { signer_name: string; signed_at: string; annotation?: string | null }[] = [];
  if (agreement.status === "signed") {
    const { data: sigs } = await supabase
      .from("signatures")
      .select("signer_name, signed_at, annotation")
      .eq("agreement_id", agreement.id)
      .order("signed_at", { ascending: true });
    signatures = sigs ?? [];
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
          <CardHeader>
            <CardTitle>{agreement.title}</CardTitle>
            <CardDescription>
              Created {new Date(agreement.created_at).toLocaleString()} · Status:{" "}
              {agreement.status}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md border bg-muted/30 p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm">{agreement.content}</pre>
            </div>
            {agreement.status === "draft" && (
              <DraftActions agreementId={agreement.id} />
            )}
            {agreement.status === "pending" && (
              <SharePanel signUrl={signUrl} agreementId={agreement.id} />
            )}
            {agreement.status === "signed" && signatures.length > 0 && (
              <div className="rounded-md border border-border bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium">Signatures</p>
                <ul className="space-y-2 text-sm">
                  {signatures.map((s, i) => (
                    <li
                      key={i}
                      className="border-b border-border/50 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-medium">{s.signer_name}</span>
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
