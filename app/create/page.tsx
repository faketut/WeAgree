import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { CreateAgreementForm } from "./create-agreement-form";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const templateIdRaw = sp.templateId;
  const templateId = typeof templateIdRaw === "string" ? templateIdRaw : undefined;

  let defaultTitle = "";
  let defaultContent = "";
  let fromTemplate: string | null = null;

  if (templateId) {
    const supabase = await createClient();
    const { data: template } = await supabase
      .from("templates")
      .select("title, content")
      .eq("id", templateId)
      .maybeSingle();

    if (template) {
      defaultTitle = template.title as string;
      defaultContent = template.content as string;
      fromTemplate = defaultTitle;
    }
  }

  return (
    <main className="min-h-screen bg-paper p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <CreateAgreementForm
          defaultTitle={defaultTitle}
          defaultContent={defaultContent}
          fromTemplate={fromTemplate}
        />
      </div>
    </main>
  );
}
