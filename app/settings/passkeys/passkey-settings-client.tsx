"use client";

import { useState, useEffect } from "react";
import {
  beginPasskeyRegistration,
  completePasskeyRegistration,
  listPasskeys,
  revokePasskey,
} from "@/app/actions/passkeys";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound } from "lucide-react";

export function PasskeySettingsClient() {
  const [loading, setLoading] = useState(false);
  const [listing, setListing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<
    {
      id: string;
      nickname: string | null;
      created_at: string;
      last_used_at: string | null;
      status: string;
    }[]
  >([]);

  async function refresh() {
    setListing(true);
    const res = await listPasskeys();
    setListing(false);
    setCredentials([...(res.credentials ?? [])]);
  }

  async function handleRevoke(id: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Revoke this passkey? It can no longer be used for signing.")
    ) {
      return;
    }
    setError(null);
    setSuccess(null);
    const res = await revokePasskey(id);
    if ("error" in res) {
      setError(res.error);
    } else {
      setSuccess("Passkey revoked.");
      await refresh();
    }
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
      const { options, challengeId } = begin as {
        options: any;
        challengeId: string;
      };
      const registration = await startRegistration(options);
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
    <Card className="border-border shadow-paper">
      <CardHeader className="space-y-2 border-b border-border pb-5">
        <p className="eyebrow">Identity</p>
        <CardTitle className="flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight">
          <KeyRound className="h-5 w-5 text-primary" />
          Signing passkeys
        </CardTitle>
        <CardDescription className="text-pretty">
          Register a passkey to cryptographically confirm your identity when signing agreements.
          GitHub login is still used for your account; the passkey is your signing key on this
          device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {listing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : credentials.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {credentials.map((c) => (
              <li
                key={c.id}
                className="rounded-sm border border-border bg-muted/30 p-3 flex items-start justify-between gap-3"
              >
                <div>
                  <span className="font-medium">{c.nickname ?? "Passkey"}</span>
                  <span className="ml-2 text-xs text-muted-foreground uppercase tracking-wider">
                    {c.status}
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">
                    Added {new Date(c.created_at).toLocaleString()}
                    {c.last_used_at && (
                      <> · Last used {new Date(c.last_used_at).toLocaleString()}</>
                    )}
                  </div>
                </div>
                {c.status === "active" && (
                  <Button variant="outline" size="sm" onClick={() => void handleRevoke(c.id)}>
                    Revoke
                  </Button>
                )}
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
          <Alert className="border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.08)]">
            <AlertDescription className="text-[hsl(var(--success))]">
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
