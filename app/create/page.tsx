"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAndPublishAgreement } from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, ArrowLeft } from "lucide-react";

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createAndPublishAgreement(formData);
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
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              New Agreement
            </CardTitle>
            <CardDescription>
              Create a new agreement. Content supports plain text or Markdown. Use{" "}
              <code className="rounded bg-muted px-1">{`{{Name}}`}</code> for placeholder
              variables.
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
                  placeholder="Enter agreement content here. You can use {{Name}} for variables."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Publishing…" : "Create & Publish"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
