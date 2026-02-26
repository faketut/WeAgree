"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signAgreement } from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PenLine, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import type { AgreementStatus } from "@/lib/types/database";

function sha256Hex(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return crypto.subtle.digest("SHA-256", data).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  });
}

type VerifyState = "idle" | "ok" | "tampered";

type SignatureRow = {
  signer_id: string;
  signer_name: string;
  signed_at: string;
  annotation?: string | null;
};

export type SignViewProps = {
  agreementId: string;
  title: string;
  content: string;
  contentHash: string;
  status: AgreementStatus;
  signatures?: SignatureRow[];
  requiredSignatures?: number;
};

export function SignView({
  agreementId,
  title,
  content,
  contentHash,
  status,
  signatures = [],
  requiredSignatures = 1,
}: SignViewProps) {
  const router = useRouter();
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [annotation, setAnnotation] = useState("");

  const alreadySigned = status === "signed";
  const currentUserSignature = user
    ? signatures.find((s) => s.signer_id === user.id)
    : null;

  useEffect(() => {
    async function verify() {
      const localHash = await sha256Hex(content);
      setVerifyState(localHash === contentHash ? "ok" : "tampered");
    }
    verify();
  }, [content, contentHash]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ? { id: u.id } : null);
    });
  }, []);

  async function handleSign() {
    if (!user) {
      const signPath = `/sign/${agreementId}`;
      router.push(`/login?redirectTo=${encodeURIComponent(signPath)}`);
      return;
    }
    setError(null);
    setSigning(true);
    const result = await signAgreement(agreementId, annotation.trim() || null);
    setSigning(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSigned(true);
    router.refresh();
  }

  const showSignedSuccess = signed || (alreadySigned && currentUserSignature);
  const showAlreadySignedNoButton = alreadySigned && !currentUserSignature;

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {alreadySigned
                ? "This agreement has been signed."
                : "Please read the agreement below. Verify content integrity before signing."}
            </CardDescription>
            <p className="text-xs text-muted-foreground">
              Latest signed agreement — This view shows the current agreement and all signatures to
              date. Anyone with the link can sign; refresh the page to see new signatures.
            </p>
            {!alreadySigned && requiredSignatures > 0 && (
              <p className="text-sm text-muted-foreground">
                Signatures: {signatures.length} of {requiredSignatures} required
              </p>
            )}
            {verifyState === "idle" && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying content…
              </p>
            )}
            {verifyState === "ok" && (
              <p className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Content integrity verified.
              </p>
            )}
            {verifyState === "tampered" && (
              <p className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Content verification failed. This document may have been tampered with. Do not sign.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md border bg-muted/30 p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
            </div>

            {signatures.length > 0 && (
              <div className="rounded-md border border-border bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium">Signatures</p>
                <ul className="space-y-2 text-sm">
                  {signatures.map((s) => (
                    <li key={s.signer_id} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
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

            {showSignedSuccess ? (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950/30">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                <div className="text-center">
                  <p className="font-medium text-green-800 dark:text-green-300">
                    {signed ? "Signed successfully" : "You have already signed"}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {currentUserSignature && !signed
                      ? `You signed on ${new Date(currentUserSignature.signed_at).toLocaleString()}`
                      : "Your signature has been recorded."}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            ) : showAlreadySignedNoButton ? (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium">This agreement has been signed.</p>
                <Button asChild variant="outline" className="mt-3">
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="sign-annotation" className="mb-1 block text-sm font-medium">
                    Comment (optional)
                  </label>
                  <textarea
                    id="sign-annotation"
                    value={annotation}
                    onChange={(e) => setAnnotation(e.target.value)}
                    placeholder="Add a short comment with your signature"
                    rows={2}
                    disabled={signing}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  onClick={handleSign}
                  disabled={verifyState !== "ok" || signing}
                  className="w-full"
                >
                  {signing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing…
                    </>
                  ) : user ? (
                    <>
                      <PenLine className="mr-2 h-4 w-4" />
                      Sign this agreement
                    </>
                  ) : (
                    "Sign in to sign this agreement"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.refresh()}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh to see latest
          </Button>
          <Link href="/" className="underline hover:text-foreground">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
