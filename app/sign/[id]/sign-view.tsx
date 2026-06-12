"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signAgreement } from "@/app/actions/agreements";
import { beginPasskeySignForAgreement } from "@/app/actions/passkeys";
import { startAuthentication } from "@simplewebauthn/browser";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PenLine,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Type as TypeIcon,
  Eraser,
  Image as ImageIcon,
} from "lucide-react";
import type { AgreementStatus } from "@/lib/types/database";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { buildSignatureSlotMap } from "@/lib/signaturePlaceholders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignaturePad } from "@/components/signature-pad";
import { SignatureUpload } from "@/components/signature-upload";
import { sha256HexBrowser } from "@/lib/utils/sha256Browser";

type VerifyState = "idle" | "ok" | "tampered";

type SignatureRow = {
  signer_id: string;
  signer_name: string;
  signed_at: string;
  annotation?: string | null;
  signature_display?: string | null;
  signature_style?: string | null;
  signer_email?: string | null;
  slot_index?: number | null;
};

export type AgreementAnchorSummary = {
  chain_name: string;
  final_proof_hash: string;
  transaction_hash: string | null;
  block_number: number | null;
  anchored_at: string | null;
  anchor_status: string;
};

export type SignViewProps = {
  agreementId: string;
  agreementVersionId: string;
  versionNumber: number;
  title: string;
  content: string;
  contentHash: string;
  status: AgreementStatus;
  signatures?: SignatureRow[];
  requiredSignatures?: number;
  passkeyRequired?: boolean;
  anchor?: AgreementAnchorSummary | null;
};

export function SignView({
  agreementId,
  agreementVersionId,
  versionNumber,
  title,
  content,
  contentHash,
  status,
  signatures = [],
  requiredSignatures = 1,
  passkeyRequired = true,
  anchor = null,
}: SignViewProps) {
  const router = useRouter();
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [annotation, setAnnotation] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [signatureStyle, setSignatureStyle] = useState<
    "script" | "bold" | "simple" | "draw" | "upload"
  >("script");
  const [signatureDataUri, setSignatureDataUri] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const alreadySigned = status === "signed";
  const currentUserSignature = user ? signatures.find((s) => s.signer_id === user.id) : null;

  useEffect(() => {
    async function verify() {
      const localHash = await sha256HexBrowser(content);
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

    if (!signatureText.trim() && !signatureDataUri) {
      setError("Please provide a signature (type, draw, or upload).");
      return;
    }

    const totalSlots = buildSignatureSlotMap(content).length;
    if (totalSlots <= 0) {
      setError("This agreement does not define any {{signature}} spots.");
      return;
    }

    if (selectedSlot == null || selectedSlot < 0 || selectedSlot >= totalSlots) {
      setError("Please choose a signature spot before signing.");
      return;
    }

    setSigning(true);
    let passkeyPayload: {
      challengeId: string;
      assertion: AuthenticationResponseJSON;
    } | null = null;

    if (passkeyRequired) {
      const begin = await beginPasskeySignForAgreement(agreementId);
      // If no passkey is registered, fall back to account keypair signing.
      if (begin && !("error" in begin && begin.error)) {
        const opts = begin as { options: any; challengeId: string };
        try {
          const assertion = await startAuthentication(opts.options);
          passkeyPayload = { challengeId: opts.challengeId, assertion };
        } catch (e) {
          setSigning(false);
          setError(e instanceof Error ? e.message : "Passkey authentication was cancelled.");
          return;
        }
      }
    }

    const result = await signAgreement(
      agreementId,
      annotation.trim() || null,
      signatureDataUri || signatureText.trim(),
      signatureStyle,
      selectedSlot,
      passkeyPayload
    );
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

  const slots = buildSignatureSlotMap(content);
  const occupiedBySlot = new Map<number, SignatureRow>();
  for (const s of signatures) {
    if (typeof s.slot_index === "number") {
      occupiedBySlot.set(s.slot_index, s);
    }
  }
  const _allSlotsFilled = slots.length > 0 && slots.every((slot) => occupiedBySlot.has(slot.index));

  return (
    <main className="min-h-screen bg-paper p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="border-border shadow-paper">
          <CardHeader className="space-y-3 border-b border-border pb-6">
            <p className="eyebrow">Agreement &middot; v{versionNumber}</p>
            <CardTitle className="font-serif text-3xl font-semibold leading-tight tracking-tight">
              {title}
            </CardTitle>
            <CardDescription className="text-pretty">
              {alreadySigned
                ? "This agreement has been signed and recorded."
                : "Read the agreement below. Content integrity is verified against the canonical hash before you sign."}
            </CardDescription>
            <p className="text-xs text-muted-foreground">
              Sign in with GitHub, then confirm with your registered passkey when you sign.
              Refresh the page to see new signatures.
            </p>
            <span className="sr-only" data-agreement-version-id={agreementVersionId} />
            {!alreadySigned && requiredSignatures > 0 && (
              <p className="text-sm text-muted-foreground">
                Signatures: <span className="font-medium text-foreground">{signatures.length}</span> of{" "}
                <span className="font-medium text-foreground">{requiredSignatures}</span> required
              </p>
            )}
            {verifyState === "idle" && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>Verifying content&hellip;</AlertDescription>
              </Alert>
            )}
            {verifyState === "ok" && (
              <Alert className="border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.08)] [&>svg]:text-[hsl(var(--success))]">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription className="text-[hsl(var(--success))]">
                  Content integrity verified.
                </AlertDescription>
              </Alert>
            )}
            {verifyState === "tampered" && (
              <Alert className="border-[hsl(var(--warning)/0.40)] bg-[hsl(var(--warning)/0.10)] [&>svg]:text-[hsl(var(--warning))]">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-[hsl(var(--warning))]">
                  Content verification failed. This document may have been tampered with. Do not
                  sign.
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="rounded-sm border border-border bg-card px-6 py-7 md:px-8 md:py-9 drop-cap">
                <MarkdownRenderer content={content} />
              </div>
              {slots.length > 0 && (
                <div className="rounded-sm border border-border bg-muted/40 p-4">
                  <p className="eyebrow mb-3">Signature spots</p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => {
                      const occupied = occupiedBySlot.get(slot.index);
                      const isSelected = selectedSlot === slot.index;
                      return (
                        <button
                          key={slot.index}
                          type="button"
                          onClick={() => {
                            if (occupied) return;
                            setSelectedSlot(isSelected ? null : slot.index);
                          }}
                          className={[
                            "rounded-sm border px-2.5 py-1 text-xs transition-colors duration-150",
                            occupied
                              ? "cursor-not-allowed border-border bg-background text-muted-foreground"
                              : isSelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background hover:bg-muted",
                          ].join(" ")}
                          disabled={!!occupied}
                        >
                          {occupied ? (
                            <>
                              Spot {slot.index + 1}: signed by{" "}
                              <span className="font-medium">
                                {occupied.signature_display || occupied.signer_name}
                              </span>
                            </>
                          ) : (
                            <>Spot {slot.index + 1}: available</>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {slots.length > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Choose one available spot to place your signature. Once a spot is signed, it
                      cannot be reused.
                    </p>
                  )}
                </div>
              )}
            </div>

            {alreadySigned && anchor && (
              <div className="rounded-sm border border-border bg-muted/40 p-5 text-sm space-y-2">
                <p className="eyebrow">Blockchain proof</p>
                <p className="text-muted-foreground text-xs">
                  Status: <span className="text-foreground">{anchor.anchor_status}</span> &middot;
                  Chain: <span className="text-foreground">{anchor.chain_name}</span>
                </p>
                {anchor.transaction_hash && (
                  <p className="font-mono text-xs break-all text-foreground">
                    <span className="text-muted-foreground">Tx</span> {anchor.transaction_hash}
                  </p>
                )}
                {anchor.block_number != null && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Block</span> {anchor.block_number}
                  </p>
                )}
                {anchor.anchored_at && (
                  <p className="text-xs text-muted-foreground">
                    Anchored {new Date(anchor.anchored_at).toLocaleString()}
                  </p>
                )}
                <p className="font-mono text-xs break-all text-muted-foreground">
                  <span className="uppercase tracking-wider">Final proof hash</span>{" "}
                  <span className="text-foreground">{anchor.final_proof_hash}</span>
                </p>
              </div>
            )}

            {signatures.length > 0 && (
              <div className="rounded-sm border border-border bg-muted/40 p-5">
                <p className="eyebrow mb-3">Signatures</p>
                <ul className="space-y-3 text-sm">
                  {signatures.map((s, i) => (
                    <li key={i} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
                      <div className="flex flex-col gap-1">
                        {s.signature_display?.startsWith("data:image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.signature_display}
                            alt={`Signature by ${s.signer_name}`}
                            className="h-12 w-auto object-contain self-start dark:invert"
                          />
                        ) : (
                          <span
                            className={
                              s.signature_style === "bold"
                                ? "font-bold tracking-wide"
                                : s.signature_style === "simple"
                                  ? "font-medium"
                                  : "italic font-semibold"
                            }
                          >
                            {s.signature_display || s.signer_name}
                          </span>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-medium text-foreground">{s.signer_name}</span>
                          <span>— {new Date(s.signed_at).toLocaleString()}</span>
                        </div>
                      </div>
                      {s.annotation != null && s.annotation.trim() !== "" && (
                        <p className="mt-1 text-muted-foreground">{s.annotation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showSignedSuccess ? (
              <div className="flex flex-col items-center gap-4 rounded-sm border border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.08)] p-7">
                <CheckCircle2 className="h-12 w-12 text-[hsl(var(--success))]" />
                <div className="text-center">
                  <p className="font-serif text-lg font-semibold text-[hsl(var(--success))]">
                    {signed ? "Signed successfully" : "You have already signed"}
                  </p>
                  <p className="mt-1 text-sm text-[hsl(var(--success)/0.85)]">
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
              <div className="rounded-sm border border-border bg-muted/40 p-5">
                <p className="text-sm font-medium">This agreement has been signed.</p>
                <Button asChild variant="outline" className="mt-3">
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <Label className="eyebrow">Your signature</Label>
                  {signatureDataUri ? (
                    <div className="relative rounded-sm border border-border bg-card p-6 flex flex-col items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signatureDataUri}
                        alt="Applied signature"
                        className="max-h-24 object-contain dark:invert"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs h-7"
                        onClick={() => {
                          setSignatureDataUri(null);
                          if (signatureStyle === "draw" || signatureStyle === "upload") {
                            // Stay in the same mode but clear data
                          }
                        }}
                      >
                        <Eraser className="mr-1 h-3 w-3" />
                        Clear signature
                      </Button>
                    </div>
                  ) : (
                    <Tabs
                      defaultValue="type"
                      onValueChange={(v) => setSignatureStyle(v as typeof signatureStyle)}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="script" className="gap-2">
                          <TypeIcon className="h-4 w-4" />
                          Type
                        </TabsTrigger>
                        <TabsTrigger value="draw" className="gap-2">
                          <PenLine className="h-4 w-4" />
                          Draw
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Upload
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="script" className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <input
                            id="signature-text"
                            value={signatureText}
                            onChange={(e) => setSignatureText(e.target.value)}
                            placeholder="Type your full name"
                            disabled={signing}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <button
                              type="button"
                              onClick={() => setSignatureStyle("script")}
                              className={`rounded border px-2 py-1 ${
                                signatureStyle === "script"
                                  ? "border-primary text-primary"
                                  : "border-border"
                              }`}
                            >
                              <span className="italic font-semibold">
                                {signatureText || "Script style"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSignatureStyle("bold")}
                              className={`rounded border px-2 py-1 ${
                                signatureStyle === "bold"
                                  ? "border-primary text-primary"
                                  : "border-border"
                              }`}
                            >
                              <span className="font-bold tracking-wide">
                                {signatureText || "Bold style"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSignatureStyle("simple")}
                              className={`rounded border px-2 py-1 ${
                                signatureStyle === "simple"
                                  ? "border-primary text-primary"
                                  : "border-border"
                              }`}
                            >
                              <span className="font-medium">{signatureText || "Simple style"}</span>
                            </button>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="draw" className="mt-4">
                        <SignaturePad
                          onSave={setSignatureDataUri}
                          onClear={() => setSignatureDataUri(null)}
                        />
                      </TabsContent>
                      <TabsContent value="upload" className="mt-4">
                        <SignatureUpload
                          onSave={setSignatureDataUri}
                          onClear={() => setSignatureDataUri(null)}
                        />
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sign-annotation">Comment (optional)</Label>
                  <Textarea
                    id="sign-annotation"
                    value={annotation}
                    onChange={(e) => setAnnotation(e.target.value)}
                    placeholder="Add a short comment with your signature"
                    rows={2}
                    disabled={signing}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
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
          <Button variant="ghost" size="sm" onClick={() => router.refresh()} className="gap-1.5">
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
