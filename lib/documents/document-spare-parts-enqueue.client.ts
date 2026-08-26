export async function requestDocumentSparePartsIndex(documentoId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/documents/${documentoId}/spare-parts-index`, { method: "POST" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? "Indicizzazione non avviata" };
  }
  return { ok: true };
}
