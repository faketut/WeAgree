import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateTemplate, deleteTemplate } from "@/app/actions/templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Trash2 } from "lucide-react";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: template, error } = await supabase
    .from("templates")
    .select("id, title, content")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !template) notFound();

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to templates
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Edit template</CardTitle>
            <CardDescription>Update or delete this template.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              action={async (formData: FormData) => {
                "use server";
                await updateTemplate(id, formData);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={template.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  rows={12}
                  defaultValue={template.content}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Save changes
              </Button>
            </form>
            <form
              action={async () => {
                "use server";
                await deleteTemplate(id);
              }}
            >
              <Button type="submit" variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete template
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
