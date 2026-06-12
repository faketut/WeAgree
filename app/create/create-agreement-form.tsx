"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAgreement, createDraftAgreement } from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, AlertCircle, Save } from "lucide-react";

export function CreateAgreementForm({
  defaultTitle,
  defaultContent,
  fromTemplate,
}: {
  defaultTitle?: string;
  defaultContent?: string;
  fromTemplate?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createAgreement(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.id) {
      router.push(`/dashboard/${result.id}`);
    }
  }

  async function handleSaveAsDraft(formEl: HTMLFormElement) {
    setError(null);
    setLoading(true);
    const formData = new FormData(formEl);
    const result = await createDraftAgreement(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.id) {
      router.push(`/dashboard/${result.id}`);
    }
  }

  return (
    <Card className="border-border shadow-paper">
      <CardHeader className="space-y-2 border-b border-border pb-5">
        <p className="eyebrow">New agreement</p>
        <CardTitle className="flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight">
          <FileText className="h-5 w-5 text-primary" />
          Draft an agreement
        </CardTitle>
        <CardDescription className="text-pretty">
          Content supports plain text or Markdown. Use{" "}
          <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]">{`{{Name}}`}</code>{" "}
          for variables and{" "}
          <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]">{`{{signature}}`}</code>{" "}
          to mark where each signer should sign.
        </CardDescription>
        {fromTemplate && (
          <p className="text-xs text-muted-foreground">
            Pre-filled from template: <span className="font-medium text-foreground">{fromTemplate}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={defaultTitle ?? ""}
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
              defaultValue={defaultContent ?? ""}
              placeholder="Enter agreement content here. Use {{signature}} wherever a signer should sign."
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating…" : "Create & publish"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="flex-1 gap-2"
              onClick={(e) => {
                const form = (e.target as HTMLElement).closest("form");
                if (form && form.reportValidity()) {
                  handleSaveAsDraft(form);
                }
              }}
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving…" : "Save as draft"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
