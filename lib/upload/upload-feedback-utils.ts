import { UPLOAD_MIN_LOADING_MS } from "@/lib/upload/upload-feedback-messages";
import { createRandomUuid } from "@/lib/uuid/create-random-uuid";

export function createUploadId(): string {
  return createRandomUuid();
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
