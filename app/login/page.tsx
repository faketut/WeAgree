"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGitHub() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("redirectTo") || "/dashboard"
          : "/dashboard";
      const siteOrigin =
        typeof window !== "undefined"
          ? (() => {
              const origin = window.location.origin;
              const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
              if (envUrl && !envUrl.includes("localhost")) return envUrl;
              return origin;
            })()
          : "";
      const callbackUrl = `${siteOrigin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Sign in with your GitHub account to create and manage agreements.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sign in failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            onClick={signInWithGitHub}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Redirecting…" : "Sign in with GitHub"}
          </Button>
          <Link
            href="/"
            className="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
