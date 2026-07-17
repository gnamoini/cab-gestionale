/** PR-0 feature flag — default off; enabled on Vercel preview for staging validation. */
export function isServerListPaginationEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_SERVER_LIST_PAGINATION === "1") return true;
  const vercelEnv =
    process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() || process.env.VERCEL_ENV?.trim() || "";
  return vercelEnv === "preview";
}

/** Lazy mezzo/profile embed — PR-5/PR-6 rollout. */
export function isLazyEmbedEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LAZY_LIST_EMBED === "1";
}
