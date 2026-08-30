export async function requestDocumentSparePartsIndex(
  documentoId: string,
  options?: { force?: boolean },
): Promise<{ ok: boolean; error?: string; warning?: string }> {
  const res = await fetch(`/api/documents/${documentoId}/spare-parts-index`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ force: options?.force === true }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; warning?: string };
  if (!res.ok) {
    return { ok: false, error: body.error ?? "Impossibile avviare l'indicizzazione." };
  }
  return { ok: true, warning: body.warning };
}
