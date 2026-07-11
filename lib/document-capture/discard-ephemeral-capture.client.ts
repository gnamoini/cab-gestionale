/** Elimina acquisizione temporanea (fire-and-forget, es. chiusura modal). */
export function discardEphemeralCaptureClient(captureId: string): void {
  void fetch(`/api/document-capture/${captureId}/discard`, {
    method: "POST",
    keepalive: true,
  }).catch(() => undefined);
}
