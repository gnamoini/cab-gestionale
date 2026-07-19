/** PR-0 feature flag — default on in prod (Sprint 1); opt-out via NEXT_PUBLIC_SERVER_LIST_PAGINATION=0 */
export function isServerListPaginationEnabled(): boolean {
  const explicit = process.env.NEXT_PUBLIC_SERVER_LIST_PAGINATION?.trim();
  if (explicit === "0" || explicit === "false") return false;
  if (explicit === "1" || explicit === "true") return true;
  return true;
}

/** Lazy mezzo/profile embed — PR-5/PR-6 rollout. */
export function isLazyEmbedEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LAZY_LIST_EMBED === "1";
}
