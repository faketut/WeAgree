"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Send, Loader2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendSignatureRequest } from "@/app/actions/agreements";

export function SharePanel({
  signUrl,
  agreementId,
}: {
  signUrl: string;
  agreementId: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(signUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSendEmail() {
    if (!email || !email.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setSendingEmail(true);
    setEmailError(null);
    setEmailSuccess(false);

    try {
      const result = await sendSignatureRequest(agreementId, email);
      if (result.error) {
        setEmailError(result.error);
      } else {
        setEmailSuccess(true);
        setEmail("");
        setTimeout(() => setEmailSuccess(false), 5000);
      }
    } catch (err) {
      setEmailError("An unexpected error occurred.");
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-border bg-muted/20 p-4">
      <p className="text-sm font-semibold">Share for signing</p>
      <p className="text-xs text-muted-foreground">
        Signers need a GitHub account and a registered signing passkey (
        <Link href="/settings/passkeys" className="underline">
          Settings → Passkeys
        </Link>
        ).
      </p>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-col items-center gap-2">
          <QRCodeSVG value={signUrl} size={160} level="M" />
          <span className="text-xs text-muted-foreground">Scan to sign</span>
        </div>
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <p className="break-all text-xs font-mono text-muted-foreground bg-muted/50 p-2 rounded border">{signUrl}</p>
            <Button variant="outline" size="sm" onClick={copyLink} className="w-full sm:w-auto">
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy link
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t border-dashed border-border/50 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-xs">Invite by email</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="signer@example.com"
                  size={1} // allow flex to shrink
                  className="h-9 flex-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={sendingEmail}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendEmail();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !email}
                  className="shrink-0"
                >
                  {sendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Send Invite</span>
                </Button>
              </div>
            </div>
            {emailError && (
              <p className="text-[10px] font-medium text-destructive">{emailError}</p>
            )}
            {emailSuccess && (
              <p className="text-[10px] font-medium text-green-600 dark:text-green-400">
                Invite link sent successfully!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
