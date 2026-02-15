"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      // Supabase redirects the browser to GitHub, so we don't navigate manually
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Sign in with your GitHub account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button
            onClick={signInWithGitHub}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Redirecting…" : "Sign in with GitHub"}
          </Button>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Link href="/" className="text-sm text-muted-foreground underline">
            Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
