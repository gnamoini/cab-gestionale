/** Se true, lettura/scrittura preventivi privilegia Supabase rispetto a localStorage. */
export function isPreventiviDbPrimary(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PREVENTIVI_DB_PRIMARY === "false") {
    return false;
  }
  return true;
}
