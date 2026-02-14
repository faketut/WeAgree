"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signAgreement } from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PenLine, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
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

type SignatureRow = { signer_id: string; signer_name: string; signed_at: string };

export function SignView({
  agreementId,
  title,
  content,
  contentHash,
  status,
  signatures = [],
}: {
  agreementId: string;
  title: string;
  content: string;
  contentHash: string;
  status: AgreementStatus;
  signatures?: SignatureRow[];
}) {
  const router = useRouter();
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);

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
    const result = await signAgreement(agreementId);
    setSigning(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSigned(true);
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
                {signatures.length > 0 && (
                  <ul className="mt-2 text-sm text-muted-foreground">
                    {signatures.map((s) => (
                      <li key={s.signer_id}>
                        {s.signer_name} — {new Date(s.signed_at).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                )}
                <Button asChild variant="outline" className="mt-3">
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            ) : (
              <>
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
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
