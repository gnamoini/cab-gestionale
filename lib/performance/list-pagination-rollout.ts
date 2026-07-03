/** PR-0 feature flag — default off; zero behavior change until enabled. */
export function isServerListPaginationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SERVER_LIST_PAGINATION === "1";
}

/** Lazy mezzo/profile embed — PR-5/PR-6 rollout. */
export function isLazyEmbedEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LAZY_LIST_EMBED === "1";
}
