"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateDraftAgreement } from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, ArrowLeft, AlertCircle } from "lucide-react";

export function EditDraftForm({
  agreementId,
  initialTitle,
  initialContent,
}: {
  agreementId: string;
  initialTitle: string;
  initialContent: string;
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
              Update title and content. Use{" "}
              <code className="rounded bg-muted px-1">{`{{signature}}`}</code> wherever a signer
              should sign. When ready, publish from the agreement page.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
