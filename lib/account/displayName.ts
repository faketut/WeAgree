type UserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type ProfileLike = { full_name?: string | null } | null | undefined;

/** Resolve a human-readable display name for a Supabase user. */
export function getDisplayName(user: UserLike, profile?: ProfileLike): string {
  const profileName = profile?.full_name;
  if (typeof profileName === "string" && profileName.trim()) return profileName;

  const metaFull = user.user_metadata?.full_name;
  if (typeof metaFull === "string" && metaFull.trim()) return metaFull;

  const metaName = user.user_metadata?.name;
  if (typeof metaName === "string" && metaName.trim()) return metaName;

  const emailLocal = user.email?.split("@")[0];
  if (emailLocal) return emailLocal;

  return "User";
}
