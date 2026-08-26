import {
  INVENTORY_TOKEN_REGEX,
  generateInventoryPublicToken,
  normalizeInventoryToken,
} from "@/lib/inventory-labels/domain/tokens";

export { INVENTORY_TOKEN_REGEX as MEZZO_QR_TOKEN_REGEX };
export { normalizeInventoryToken as normalizeMezzoQrToken };
export { generateInventoryPublicToken as generateMezzoPublicToken };

export function isValidMezzoQrTokenFormat(token: string): boolean {
  return INVENTORY_TOKEN_REGEX.test(token.trim().toUpperCase());
}

export function buildMezzoQrUrl(token: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/m/q/${encodeURIComponent(normalizeInventoryToken(token))}`;
}
