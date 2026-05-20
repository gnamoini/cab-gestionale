/**
 * Filtro soft-delete conmotione per query Supabase su `lavorazioni`.
 * Richiede migration `20260520180000` / `20260520190000` (`deleted_at` timestamptz).
 */
export type LavorazioniNotDeletedQuery = {
  is(column: string, value: null): LavorazioniNotDeletedQuery;
};

export function applyLavorazioniNotDeletedFilter<T extends LavorazioniNotDeletedQuery>(q: T): T {
  return q.is("deleted_at", null) as T;
}
