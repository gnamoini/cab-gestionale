/**
 * UUID v4 — browser-safe SSOT (no import da node:crypto: Turbopack polyfill rompe randomUUID).
 * Usato da rename-plan e moduli client; node:crypto nel bundle browser → e6.randomUUID is not a function.
 */
export function createRandomUuid(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    try {
      return c.randomUUID();
    } catch {
      /* fall through */
    }
  }
  return `uuid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
