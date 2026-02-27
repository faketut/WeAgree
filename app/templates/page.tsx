import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
            <p className="text-muted-foreground">Reusable agreement templates.</p>
          </div>
          <Button asChild>
            <Link href="/templates/new">New template</Link>
          </Button>
        </div>

        {templates && templates.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <Card key={t.id} className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-1">{t.title}</CardTitle>
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
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No templates yet. Create one to reuse its content when drafting agreements.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

