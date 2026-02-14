import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SharePanel } from "./share-panel";
import { ArrowLeft } from "lucide-react";

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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const signUrl = `${baseUrl}/sign/${agreement.id}`;

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
            {agreement.status === "pending" && (
              <SharePanel signUrl={signUrl} agreementId={agreement.id} />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
