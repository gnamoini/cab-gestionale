import { randomBytes } from "node:crypto";

/** UUIDv7 — time-sortable technical correlation id (ADR import-core). */
export function createImportCorrelationId(): string {
  let unixMs = Date.now();
  const rand = randomBytes(10);
  const bytes = new Uint8Array(16);

  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = unixMs & 0xff;
    unixMs = Math.floor(unixMs / 256);
  }
  bytes[6] = 0x70 | (rand[0]! & 0x0f);
  bytes[7] = rand[1]!;
  bytes[8] = 0x80 | (rand[2]! & 0x3f);
  bytes[9] = rand[3]!;
  bytes[10] = rand[4]!;
  bytes[11] = rand[5]!;
  bytes[12] = rand[6]!;
  bytes[13] = rand[7]!;
  bytes[14] = rand[8]!;
  bytes[15] = rand[9]!;

  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Human-readable id for UI / support (not a PK). */
export function formatImportCorrelationDisplay(correlationId: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const compact = correlationId.replace(/-/g, "").toUpperCase();
  const short = compact.slice(-5) || compact.slice(0, 5);
  return `IMP-${date}-${short}`;
}

export function isImportCorrelationId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export function resolveImportCorrelationId(
  headerValue: string | null | undefined,
  fallback?: () => string,
): string {
  const trimmed = headerValue?.trim();
  if (trimmed && isImportCorrelationId(trimmed)) return trimmed;
  return fallback?.() ?? createImportCorrelationId();
}
