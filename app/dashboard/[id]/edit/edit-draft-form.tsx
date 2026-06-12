"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateDraftAgreement } from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, ArrowLeft, AlertCircle } from "lucide-react";

export function EditDraftForm({
  agreementId,
  initialTitle,
  initialContent,
  status,
}: {
  agreementId: string;
  initialTitle: string;
  initialContent: string;
  status: "draft" | "pending";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const title = (form.querySelector('[name="title"]') as HTMLInputElement)?.value?.trim();
    const content = (form.querySelector('[name="content"]') as HTMLTextAreaElement)?.value?.trim();
    const result = await updateDraftAgreement(agreementId, { title, content });
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.push(`/dashboard/${agreementId}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-paper p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href={`/dashboard/${agreementId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to agreement
        </Link>
        <Card className="border-border shadow-paper">
          <CardHeader className="space-y-2 border-b border-border pb-5">
            <p className="eyebrow">{status === "pending" ? "Pending edit" : "Draft edit"}</p>
            <CardTitle className="flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight">
              <FileText className="h-5 w-5 text-primary" />
              {status === "pending" ? "Edit pending agreement" : "Edit draft"}
            </CardTitle>
            <CardDescription className="text-pretty">
              Update title and content. Use{" "}
              <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]">{`{{signature}}`}</code>{" "}
              wherever a signer should sign.
              {status === "draft"
                ? " When ready, publish from the agreement page."
                : " If others have already signed, saving creates a new version and they will need to sign again."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={initialTitle}
                  placeholder="e.g. Service Agreement"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  rows={12}
                  required
                  disabled={loading}
                  defaultValue={initialContent}
                  placeholder="Enter agreement content here. Use {{signature}} wherever a signer should sign."
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
