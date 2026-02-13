"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAuthingClient, AUTHING_PROVIDER_GITHUB } from "@/lib/authing-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github } from "lucide-react";

function isAuthingServerError(message: string): boolean {
  return (
    message.includes("500") ||
    message.includes("unable to handle") ||
    message.toLowerCase().includes("core.authing.cn")
  );
}

const AUTHING_SERVER_ERROR_MSG =
  "Authing 服务暂时异常（HTTP 500）。请检查：1) Authing 控制台「社会化登录」中 GitHub 已开启且 Client ID/Secret 正确；2) GitHub OAuth App 的回调 URL 与 Authing 提供的一致；3) 稍后重试或联系 Authing 支持。";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGitHubLogin() {
    setError(null);
    setLoading(true);
    const authing = getAuthingClient();
    if (!authing) {
      setError("Authing 未配置，请设置 NEXT_PUBLIC_AUTHING_APP_ID");
      setLoading(false);
      return;
    }
    try {
      await authing.social.authorize(AUTHING_PROVIDER_GITHUB, {
        popup: true,
        onSuccess: async (user: { token?: string; id_token?: string; [key: string]: unknown }) => {
          const token = user?.token ?? user?.id_token;
          if (!token) {
            setError("登录成功但未获取到 token");
            setLoading(false);
            return;
          }
          const res = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (!res.ok) {
            setError("设置登录状态失败");
            setLoading(false);
            return;
          }
          window.location.href = redirectTo;
        },
        onError: (code: number, message: string) => {
          const msg = message || `登录失败 (${code})`;
          setError(
            isAuthingServerError(msg) ? AUTHING_SERVER_ERROR_MSG : msg
          );
          setLoading(false);
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "GitHub 登录失败";
      setError(isAuthingServerError(msg) ? AUTHING_SERVER_ERROR_MSG : msg);
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl">登录</CardTitle>
          <CardDescription>使用 GitHub 账号登录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={handleGitHubLogin}
            disabled={loading}
          >
            <Github className="mr-2 h-5 w-5" />
            {loading ? "正在跳转…" : "使用 GitHub 登录"}
          </Button>
          {error && (
            <p className="text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            未配置 Authing 时请在控制台开启「GitHub」社会化登录并填写应用 ID。
          </p>
        </CardContent>
      </Card>
      <Link href="/" className="mt-6 text-sm text-muted-foreground hover:underline">
        返回首页
      </Link>
    </main>
  );
}
