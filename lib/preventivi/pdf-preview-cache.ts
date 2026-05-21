/** Cache volatile anteprima PDF (token monouso, ~2 min). OK in dev / singola istanza. */
type PreviewEntry = {
  bytes: Uint8Array;
  fileName: string;
  exp: number;
};

const store = new Map<string, PreviewEntry>();
const TTL_MS = 120_000;

function purgeExpired(): void {
  const now = Date.now();
  for (const [token, entry] of store) {
    if (entry.exp <= now) store.delete(token);
  }
}

export function storePdfPreview(bytes: Uint8Array, fileName: string): string {
  purgeExpired();
  const token = crypto.randomUUID();
  store.set(token, { bytes, fileName, exp: Date.now() + TTL_MS });
  return token;
}

export function readPdfPreview(token: string): { bytes: Uint8Array; fileName: string } | null {
  purgeExpired();
  const key = token.trim();
  const hit = store.get(key);
  if (!hit || hit.exp <= Date.now()) {
    store.delete(key);
    return null;
  }
  return { bytes: hit.bytes, fileName: hit.fileName };
}
