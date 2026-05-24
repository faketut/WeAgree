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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.25]" />
      <div className="pointer-events-none absolute inset-0 bg-spotlight" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 19.5V8.5a2 2 0 0 0-.586-1.414l-4.5-4.5A2 2 0 0 0 13.5 2H6a2 2 0 0 0-2 2v15.5" />
                <path d="m18 16-2-1-2 1V4" />
                <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
              </svg>
            </span>
            <span>We Agree</span>
          </Link>
        </div>
        <Card className="border-border/70 shadow-elevated">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription className="text-balance">
              Sign in with GitHub to create and manage agreements. Register a passkey under Settings
              after signing in.
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
              className="w-full gap-2"
              size="lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.27-1.69-1.27-1.69-1.04-.71.08-.69.08-.69 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.19 1.18a11.1 11.1 0 0 1 5.8 0c2.22-1.49 3.18-1.18 3.18-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.82 1.18 3.08 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
              </svg>
              {loading ? "Redirecting…" : "Continue with GitHub"}
            </Button>
            <Link
              href="/"
              className="text-center text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to home
            </Link>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to use the platform responsibly. Your signatures are bound to your
          device.
        </p>
      </div>
    </main>
  );
}
