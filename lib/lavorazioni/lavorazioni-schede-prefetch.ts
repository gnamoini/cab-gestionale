/** SSR + cold client: schede solo per la prima pagina lista (allineato a paginazione client default). */
export const LAVORAZIONI_INITIAL_SCHEde_PREFETCH_LIMIT = 100;

export function pickLavorazioniInitialSchedeIds(
  rows: readonly { id: string }[],
  limit = LAVORAZIONI_INITIAL_SCHEde_PREFETCH_LIMIT,
): string[] {
  return rows.slice(0, Math.max(0, limit)).map((r) => r.id);
}

export function buildLavorazioniSchedeCodiciMap(
  rows: readonly { id: string; codice?: string | null }[],
  ids: readonly string[],
): Record<string, string | null> {
  const byId = new Map(rows.map((r) => [r.id, r.codice ?? null] as const));
  const codici: Record<string, string | null> = {};
  for (const id of ids) codici[id] = byId.get(id) ?? null;
  return codici;
}
