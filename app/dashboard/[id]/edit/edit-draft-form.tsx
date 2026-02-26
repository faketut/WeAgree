"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateDraftAgreement } from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, ArrowLeft } from "lucide-react";

export function EditDraftForm({
  agreementId,
  initialTitle,
  initialContent,
  initialRequiredSignatures,
}: {
  agreementId: string;
  initialTitle: string;
  initialContent: string;
  initialRequiredSignatures: number;
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
    const requiredSignaturesRaw = (form.querySelector('[name="required_signatures"]') as HTMLInputElement)?.value;
    const required_signatures = Math.max(1, parseInt(requiredSignaturesRaw ?? "1", 10) || 1);
    const result = await updateDraftAgreement(agreementId, { title, content, required_signatures });
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.push(`/dashboard/${agreementId}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href={`/dashboard/${agreementId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to agreement
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Edit draft
            </CardTitle>
            <CardDescription>
              Update title and content. When ready, publish from the agreement page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="mb-1 block text-sm font-medium">
                  Title
                </label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={initialTitle}
                  placeholder="e.g. Service Agreement"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="content" className="mb-1 block text-sm font-medium">
                  Content
                </label>
                <textarea
                  id="content"
                  name="content"
                  rows={12}
                  required
                  disabled={loading}
                  defaultValue={initialContent}
                  placeholder="Enter agreement content here. You can use {{Name}} for variables."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="required_signatures" className="mb-1 block text-sm font-medium">
                  Required signatures
                </label>
                <Input
                  id="required_signatures"
                  name="required_signatures"
                  type="number"
                  min={1}
                  defaultValue={initialRequiredSignatures}
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Number of signers needed before the agreement is fully signed.
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
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
