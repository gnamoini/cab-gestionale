/** Client-safe request id resolution (no next/headers). */

export function resolveRequestId(explicit?: string | null): string | null {
  if (explicit) return explicit;
  if (typeof globalThis !== "undefined") {
    const g = globalThis as { __auditRequestId?: string };
    if (g.__auditRequestId) return g.__auditRequestId;
  }
  return null;
}

export function setRequestIdForContext(requestId: string): void {
  if (typeof globalThis !== "undefined") {
    (globalThis as { __auditRequestId?: string }).__auditRequestId = requestId;
  }
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}
