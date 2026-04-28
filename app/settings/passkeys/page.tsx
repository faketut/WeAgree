import Link from "next/link";
import { PasskeySettingsClient } from "./passkey-settings-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Passkeys · WeAgree",
};

export default function PasskeysSettingsPage() {
  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-lg space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
        <PasskeySettingsClient />
      </div>
    </main>
  );
}
