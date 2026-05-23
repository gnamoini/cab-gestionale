import type { QueryClient } from "@tanstack/react-query";
import { magazzinoRowToRicambioUI, ricambioUiToMagazzinoInsert } from "@/lib/magazzino/magazzino-db-ui-adapter";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { QK } from "@/src/lib/react-query/query-keys";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export function magazzinoListQueryKey() {
  return [...QK.magazzino, null] as const;
}

export function mapMagazzinoRowsToUI(rows: readonly MagazzinoRicambioRow[], autore = "Sistema"): RicambioMagazzino[] {
  return rows.map((row) => magazzinoRowToRicambioUI(row, autore));
}

function uiItemToRow(ui: RicambioMagazzino, existing?: MagazzinoRicambioRow): MagazzinoRicambioRow {
  const patch = ricambioUiToMagazzinoInsert(ui);
  if (existing) {
    return {
      ...existing,
      codice: patch.codice,
      nome: patch.nome,
      marca: patch.marca ?? null,
      quantita: patch.quantita ?? existing.quantita,
      costo: patch.costo ?? null,
      prezzo_vendita: patch.prezzo_vendita ?? null,
      meta: (patch.meta ?? existing.meta) as MagazzinoRicambioRow["meta"],
      updated_at: ui.dataUltimaModifica,
    };
  }
  const now = ui.dataUltimaModifica || new Date().toISOString();
  return {
    id: ui.id,
    codice: patch.codice,
    nome: patch.nome,
    marca: patch.marca ?? null,
    quantita: patch.quantita ?? 0,
    costo: patch.costo ?? null,
    prezzo_vendita: patch.prezzo_vendita ?? null,
    consumo_medio_mensile: null,
    meta: (patch.meta ?? {}) as MagazzinoRicambioRow["meta"],
    created_at: now,
    updated_at: now,
  };
}

/** Patch ottimistico cache lista magazzino (unica source UI). */
export function patchMagazzinoListCache(
  qc: QueryClient,
  updater: (prev: RicambioMagazzino[]) => RicambioMagazzino[],
  autore = "Sistema",
): void {
  qc.setQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey(), (old) => {
    const ui = mapMagazzinoRowsToUI(old ?? [], autore);
    const next = updater(ui);
    const rowById = new Map((old ?? []).map((row) => [row.id, row]));
    return next.map((item) => uiItemToRow(item, rowById.get(item.id)));
  });
}

export function setMagazzinoListCacheRows(qc: QueryClient, rows: MagazzinoRicambioRow[]): void {
  qc.setQueryData(magazzinoListQueryKey(), rows);
}
