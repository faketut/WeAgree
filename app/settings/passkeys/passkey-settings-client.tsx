"use client";

import { useState, useEffect } from "react";
import {
  beginPasskeyRegistration,
  completePasskeyRegistration,
  listPasskeys,
} from "@/app/actions/passkeys";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound } from "lucide-react";

export function PasskeySettingsClient() {
  const [loading, setLoading] = useState(false);
  const [listing, setListing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<
    { id: string; nickname: string | null; created_at: string; last_used_at: string | null; status: string }[]
  >([]);

  async function refresh() {
    setListing(true);
    const res = await listPasskeys();
    setListing(false);
    setCredentials(res.credentials ?? []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function register() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const begin = await beginPasskeyRegistration();
      if ("error" in begin && begin.error) {
        setError(begin.error);
        setLoading(false);
        return;
      }
      const { optionsJSON, challengeId } = begin as {
        optionsJSON: string;
        challengeId: string;
      };
      const registration = await startRegistration({ optionsJSON });
      const done = await completePasskeyRegistration(challengeId, registration);
      if ("error" in done && done.error) {
        setError(done.error);
      } else {
        setSuccess("Passkey registered. You can now sign agreements with it.");
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Signing passkeys
        </CardTitle>
        <CardDescription>
          Register a passkey to cryptographically confirm your identity when signing
          agreements. GitHub login is still used for your account; the passkey is your
          signing key on this device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {listing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : credentials.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {credentials.map((c) => (
              <li key={c.id} className="rounded border p-3">
                <span className="font-medium">{c.nickname ?? "Passkey"}</span>
                <span className="ml-2 text-muted-foreground">({c.status})</span>
                <div className="text-xs text-muted-foreground mt-1">
                  Added {new Date(c.created_at).toLocaleString()}
                  {c.last_used_at && (
                    <> · Last used {new Date(c.last_used_at).toLocaleString()}</>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
            <AlertDescription className="text-green-800 dark:text-green-200">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={() => void register()} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registering…
            </>
          ) : (
            <>
              <KeyRound className="mr-2 h-4 w-4" />
              Register a new passkey
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
