"use client";

/** performance.mark per provider — Sprint 2.6 mount profile. */
export function markProviderMountStart(providerId: string): void {
  if (typeof performance === "undefined") return;
  try {
    performance.mark(`provider:${providerId}:start`);
  } catch {
    /* ponytail: dev/bench only */
  }
}

export function markProviderMountEnd(providerId: string): void {
  if (typeof performance === "undefined") return;
  try {
    const end = `provider:${providerId}:end`;
    performance.mark(end);
    performance.measure(`provider:${providerId}`, `provider:${providerId}:start`, end);
  } catch {
    /* ignore */
  }
}

export function collectProviderMountMeasures(): { provider: string; mountMs: number }[] {
  if (typeof performance === "undefined" || !performance.getEntriesByType) return [];
  const out: { provider: string; mountMs: number }[] = [];
  for (const entry of performance.getEntriesByType("measure")) {
    const m = /^provider:(.+)$/.exec(entry.name);
    if (!m) continue;
    out.push({ provider: m[1], mountMs: Math.round(entry.duration * 10) / 10 });
  }
  return out;
}

export function exposeProviderMountProfile(): void {
  if (typeof window === "undefined") return;
  (window as Window & { __GESTIONALE_PROVIDER_MOUNT_PROFILE__?: ReturnType<typeof collectProviderMountMeasures> }).__GESTIONALE_PROVIDER_MOUNT_PROFILE__ =
    collectProviderMountMeasures();
}
