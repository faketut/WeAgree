"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publishAgreement } from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Pencil, Loader2, AlertCircle } from "lucide-react";

export function DraftActions({ agreementId }: { agreementId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setError(null);
    setLoading(true);
    const result = await publishAgreement(agreementId);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handlePublish} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Publish
            </>
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/${agreementId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit draft
          </Link>
        </Button>
      </div>
    </div>
  );
}
