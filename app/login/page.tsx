"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getAuthingClient, isAuthingConfigured } from "@/lib/auth/authing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AUTHING_QR_CONTAINER_ID = "authing-qrcode-container";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!isAuthingConfigured()) {
      setStatus("error");
      setMessage(
        "Authing is not configured. Set NEXT_PUBLIC_AUTHING_APP_ID and NEXT_PUBLIC_AUTHING_APP_HOST in .env.local"
      );
      return;
    }

    setStatus("loading");
    const authing = getAuthingClient();

    authing.qrcode.startScanning(AUTHING_QR_CONTAINER_ID, {
      onSuccess: async (userInfo, ticket) => {
        if (!mounted.current) return;
        setMessage("Login successful, redirecting…");
        setStatus("success");
        try {
          const user = await authing.qrcode.exchangeUserInfo(ticket);
          const token = (user as { token?: string }).token;
          if (!token) {
            setStatus("error");
            setMessage("Could not get login token");
            return;
          }
          const redirectTo =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("redirectTo") || "/dashboard"
              : "/dashboard";
          const res = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, redirectTo }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setStatus("error");
            setMessage(data.error || "Session setup failed");
            return;
          }
          window.location.href = data.redirectTo || redirectTo;
        } catch (e) {
          setStatus("error");
          setMessage(e instanceof Error ? e.message : "Login failed");
        }
      },
      onError: (data: { message?: string }) => {
        if (mounted.current) setMessage(data?.message || "QR error");
      },
      onExpired: () => {
        if (mounted.current) {
          setMessage("QR code expired. Refresh the page for a new one.");
        }
      },
      onCancel: () => {
        if (mounted.current) setMessage("Login cancelled. Scan again to retry.");
      },
    });

    return () => {
      mounted.current = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Scan the QR code with your Authing app to log in (PC scan code login).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div
            id={AUTHING_QR_CONTAINER_ID}
            className="min-h-[280px] min-w-[280px] rounded-lg border bg-white"
          />
          {status === "loading" && (
            <p className="text-sm text-muted-foreground">Waiting for scan…</p>
          )}
          {status === "success" && (
            <p className="text-sm text-primary">{message}</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">{message}</p>
          )}
          {message && status !== "success" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Refresh QR code
            </Button>
          )}
          <Link href="/" className="text-sm text-muted-foreground underline">
            Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
