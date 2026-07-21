export function assertCaptureLavorazioneLinked(
  capture: { lavorazione_id?: string | null } | null | undefined,
  expectedLavorazioneId: string,
): void {
  const linked = capture?.lavorazione_id?.trim() ?? "";
  if (!linked) {
    throw new Error("Lavorazione non collegata al documento. Riprova.");
  }
  if (linked !== expectedLavorazioneId) {
    throw new Error("Lavorazione collegata non corrisponde alla selezione. Riprova.");
  }
}

/** PATCH capture → lavorazione con verifica HTTP e link persistito. */
export async function patchCaptureLavorazioneLink(captureId: string, lavorazioneId: string): Promise<void> {
  const res = await fetch(`/api/document-capture/${captureId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lavorazioneId }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Collegamento capture non riuscito");
  }

  const verifyRes = await fetch(`/api/document-capture/${captureId}`);
  const verifyBody = (await verifyRes.json().catch(() => ({}))) as {
    error?: string;
    capture?: { lavorazione_id?: string | null };
  };
  if (!verifyRes.ok) {
    throw new Error(verifyBody.error ?? "Verifica collegamento capture non riuscita");
  }
  assertCaptureLavorazioneLinked(verifyBody.capture, lavorazioneId);
}
