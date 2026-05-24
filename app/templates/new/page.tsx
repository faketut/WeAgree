import Link from "next/link";
import { createTemplate } from "@/app/actions/templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export default function NewTemplatePage() {
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
            <CardTitle>New template</CardTitle>
            <CardDescription>Create a reusable agreement template.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={async (formData: FormData) => {
                "use server";
                await createTemplate(formData);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. Service Agreement Template"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  rows={12}
                  required
                  placeholder="Template content. You can use {{Name}} variables."
                />
              </div>
              <Button type="submit" className="w-full">
                Create template
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
