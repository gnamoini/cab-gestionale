/** Crockford Base32 — no O/0/I/1 ambiguity. */
export const INVENTORY_TOKEN_CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const INVENTORY_TOKEN_BODY_LENGTH = 10;
export const INVENTORY_TOKEN_PREFIX = "CAB-";

/** Public token pattern: optional CAB- + 8–14 body chars from charset. */
export const INVENTORY_TOKEN_REGEX = /^(?:CAB-)?[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8,14}$/;

export function isValidInventoryTokenFormat(token: string): boolean {
  return INVENTORY_TOKEN_REGEX.test(token.trim().toUpperCase());
}

export function normalizeInventoryToken(token: string): string {
  return token.trim().toUpperCase();
}

/** Generate a compact public token (client-safe / tests). */
export function generateInventoryTokenBody(length = INVENTORY_TOKEN_BODY_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * INVENTORY_TOKEN_CHARSET.length);
    out += INVENTORY_TOKEN_CHARSET[idx];
  }
  return out;
}

export function generateInventoryPublicToken(opts?: { withPrefix?: boolean }): string {
  const body = generateInventoryTokenBody();
  return opts?.withPrefix === false ? body : `${INVENTORY_TOKEN_PREFIX}${body}`;
}

export function buildInventoryQrUrl(token: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/r/${encodeURIComponent(normalizeInventoryToken(token))}`;
}
