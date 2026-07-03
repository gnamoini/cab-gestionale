/** PR-6 — debounced invalidate jitter (single layer). */

export const INVALIDATION_JITTER_MS = { min: 300, max: 800 } as const;

export function invalidationJitterDelayMs(): number {
  const span = INVALIDATION_JITTER_MS.max - INVALIDATION_JITTER_MS.min;
  return INVALIDATION_JITTER_MS.min + Math.floor(Math.random() * (span + 1));
}

export function scheduleDebouncedInvalidate(fn: () => void, baseMs = 0): ReturnType<typeof setTimeout> {
  return setTimeout(fn, baseMs + invalidationJitterDelayMs());
}
