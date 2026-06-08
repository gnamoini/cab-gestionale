/** Estrae project ref da URL Supabase (`https://<ref>.supabase.co`). */
export function projectRefFromSupabaseUrl(url: string): string | null {
  try {
    const host = new URL(url.trim()).hostname;
    const [ref] = host.split(".");
    return ref?.trim() || null;
  } catch {
    return null;
  }
}

export function resolveSupabaseProjectRef(): string | null {
  const explicit = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicit) return explicit;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;

  return projectRefFromSupabaseUrl(url);
}
