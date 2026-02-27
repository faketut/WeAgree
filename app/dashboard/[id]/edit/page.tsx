import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditDraftForm } from "./edit-draft-form";

export default async function EditDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: agreement, error } = await supabase
    .from("agreements")
    .select("id, title, content, status")
    .eq("id", id)
    .eq("creator_id", user.id)
    .single();

  if (error || !agreement || agreement.status !== "draft") notFound();

  return (
    <EditDraftForm
      agreementId={agreement.id}
      initialTitle={agreement.title}
      initialContent={agreement.content}
    />
  );
}
