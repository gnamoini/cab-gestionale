import { UPLOAD_MIN_LOADING_MS } from "@/lib/upload/upload-feedback-messages";

export function createUploadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function uploadErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Caricamento non riuscito.";
}

/** Attende il tempo minimo di loading dopo `startedAt`. */
export async function ensureMinUploadLoading(startedAt: number, minMs = UPLOAD_MIN_LOADING_MS): Promise<void> {
  const elapsed = Date.now() - startedAt;
  const remaining = minMs - elapsed;
  if (remaining > 0) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, remaining);
    });
  }
}
