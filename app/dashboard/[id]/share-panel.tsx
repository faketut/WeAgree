"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

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

  return (
    <div className="space-y-4 rounded-lg border border-dashed p-4">
      <p className="text-sm font-medium">Share for signing</p>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-col items-center gap-2">
          <QRCodeSVG value={signUrl} size={160} level="M" />
          <span className="text-xs text-muted-foreground">Scan to sign</span>
        </div>
        <div className="flex-1 space-y-2">
          <p className="break-all text-sm text-muted-foreground">{signUrl}</p>
          <Button variant="outline" size="sm" onClick={copyLink}>
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
      </div>
    </div>
  );
}
