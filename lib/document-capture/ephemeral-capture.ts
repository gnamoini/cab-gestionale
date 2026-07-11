/** Upload da flusso Lavorazioni → Acquisizione AI: temporanei, solo lettura. */
export const DOCUMENT_CAPTURE_EPHEMERAL_SOURCE = "lavorazioni_drop";

export const EPHEMERAL_CAPTURE_DELETION_REASON = "ephemeral_dispose";

export function isEphemeralCaptureSource(source: string | null | undefined): boolean {
  return source === DOCUMENT_CAPTURE_EPHEMERAL_SOURCE;
}
