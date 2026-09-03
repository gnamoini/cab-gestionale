import type { CabDocumentType } from "@/lib/integrations/unoerp/types";

export function buildCorrelationKey(type: CabDocumentType, cabId: string): string {
  return `CAB|${type}|${cabId}`;
}

export function parseCorrelationKey(raw: string): { type: CabDocumentType; id: string } | null {
  const m = /^CAB\|(preventivo|consuntivo|ddt)\|([0-9a-f-]{36})$/i.exec(raw.trim());
  if (!m) return null;
  return { type: m[1]!.toLowerCase() as CabDocumentType, id: m[2]! };
}
