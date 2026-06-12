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
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-paper p-4">
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5"
          >
            <span
              aria-hidden
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-xs transition-transform duration-150 group-hover:scale-[1.04]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V9z" />
                <path d="M14 3v6h6" />
                <path d="M10 13h4" />
                <path d="M10 17h4" />
              </svg>
            </span>
            <span className="font-serif text-lg font-semibold tracking-tight">
              We Agree<span className="text-primary">.</span>
            </span>
          </Link>
          <p className="eyebrow mt-6">Sign in</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-pretty mt-3 max-w-sm text-sm text-muted-foreground">
            Sign in with GitHub to draft and sign agreements. Register a passkey under{" "}
            <span className="text-foreground">Settings</span> after signing in.
          </p>
        </div>
        <Card className="border-border shadow-paper">
          <CardHeader className="sr-only">
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in with GitHub to continue.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-6">
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
              className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back to home
            </Link>
          </CardContent>
        </Card>
        <p className="text-pretty mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          By continuing you agree to use the platform responsibly. Your signatures are bound to your
          device.
        </p>
      </div>
    </main>
  );
}
