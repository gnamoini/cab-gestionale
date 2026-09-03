/** Env UnoERP — solo server. Mai NEXT_PUBLIC_. */
export function readUnoerpBaseUrl(): string | null {
  const v = process.env.UNOERP_BASE_URL?.trim() ?? "";
  return v || null;
}

export function readUnoerpApiKey(): string | null {
  const v = process.env.UNOERP_API_KEY?.trim() ?? "";
  return v || null;
}

export function readUnoerpApiUser(): string | null {
  const v = process.env.UNOERP_API_USER?.trim() ?? "";
  return v || null;
}

export function readUnoerpApiPassword(): string | null {
  const v = process.env.UNOERP_API_PASSWORD ?? "";
  return v.length > 0 ? v : null;
}

export function readUnoerpTimeoutMs(): number {
  const n = Number(process.env.UNOERP_API_TIMEOUT_MS ?? "15000");
  return Number.isFinite(n) && n > 0 ? n : 15000;
}

/** Circuit breaker incident-response. Non è un feature flag di prodotto. */
export function isUnoerpSyncHardStop(): boolean {
  const v = (process.env.UNOERP_SYNC_HARD_STOP ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function isUnoerpConfigured(): boolean {
  if (readUnoerpBaseUrl() == null) return false;
  if (readUnoerpApiKey() != null) return true;
  return readUnoerpApiUser() != null && readUnoerpApiPassword() != null;
}
