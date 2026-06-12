import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">You must be signed in to manage templates.</p>
      </main>
    );
  }

  const { data: templates } = await supabase
    .from("templates")
    .select("id, title, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-paper p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="rounded-sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to dashboard</span>
              </Link>
            </Button>
            <div className="space-y-1">
              <p className="eyebrow">Library</p>
              <h1 className="font-serif text-3xl font-semibold tracking-tight">Templates</h1>
              <p className="text-sm text-muted-foreground">
                Reusable agreement boilerplate for faster drafting.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/templates/new">New template</Link>
          </Button>
        </div>

        {templates && templates.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {templates.map((t) => (
              <Card
                key={t.id}
                className="border-border transition-colors duration-150 hover:bg-muted/30"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-lg font-semibold tracking-tight line-clamp-1">
                    {t.title}
                  </CardTitle>
                  <CardDescription>
                    {t.created_at ? new Date(t.created_at as string).toLocaleDateString() : null}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2 pt-0">
                  <Button asChild variant="default" size="sm">
                    <Link href={`/create?templateId=${t.id}`}>Use</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/templates/${t.id}/edit`}>Edit</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No templates yet. Create one to reuse its content when drafting agreements.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
