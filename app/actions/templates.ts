"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitKey } from "@/lib/ratelimit";
import { revalidatePath } from "next/cache";

const TEMPLATE_WRITE_LIMIT = 60;
const TEMPLATE_WRITE_WINDOW_SECONDS = 60;

async function checkTemplateWriteLimit(userId: string) {
  const rl = await rateLimit(
    rateLimitKey("tpl-write", userId),
    TEMPLATE_WRITE_LIMIT,
    TEMPLATE_WRITE_WINDOW_SECONDS
  );
  return rl.allowed;
}

export async function createTemplate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!(await checkTemplateWriteLimit(user.id))) {
    return { error: "Too many template changes; try again later." };
  }

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  if (!title) return { error: "Title is required" };
  if (!content) return { error: "Content is required" };

  const { error } = await supabase.from("templates").insert({
    user_id: user.id,
    title,
    content,
  });

  if (error) return { error: error.message };

  revalidatePath("/templates");
  return { success: true };
}

export async function updateTemplate(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!(await checkTemplateWriteLimit(user.id))) {
    return { error: "Too many template changes; try again later." };
  }

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  if (!title) return { error: "Title is required" };
  if (!content) return { error: "Content is required" };

  const { error } = await supabase
    .from("templates")
    .update({ title, content })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/templates");
  revalidatePath(`/templates/${id}/edit`);
  return { success: true };
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!(await checkTemplateWriteLimit(user.id))) {
    return { error: "Too many template changes; try again later." };
  }

  const { error } = await supabase.from("templates").delete().eq("id", id).eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/templates");
  return { success: true };
}
