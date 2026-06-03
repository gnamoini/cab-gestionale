import type { QueryClient } from "@tanstack/react-query";
import { magazzinoListQueryKey, ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";
import { stockSnapshotFromRicambio, type StockSnapshot } from "@/lib/magazzino/ricambio-stock-crossing";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { QK } from "@/src/lib/react-query/query-keys";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

/** Read-only: cerca un ricambio nella cache lista magazzino già caricata. */
export function findRicambioInListCache(
  qc: QueryClient,
  ricambioId: string,
  mezziListe?: MezziListePrefs,
): RicambioMagazzino | undefined {
  const id = ricambioId.trim();
  if (!id) return undefined;

  const entries = qc.getQueriesData<MagazzinoRicambioRow[]>({ queryKey: QK.magazzino });
  for (const [, data] of entries) {
    const hit = data?.find((r) => r.id === id);
    if (hit) return ricambioUiFromMagazzinoRow(hit, "Sistema", mezziListe);
  }

  const direct = qc.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey());
  const row = direct?.find((r) => r.id === id);
  if (row) return ricambioUiFromMagazzinoRow(row, "Sistema", mezziListe);
  return undefined;
}

export function stockSnapshotFromListCache(
  qc: QueryClient,
  ricambioId: string,
  mezziListe?: MezziListePrefs,
): StockSnapshot | undefined {
  const ricambio = findRicambioInListCache(qc, ricambioId, mezziListe);
  if (!ricambio) return undefined;
  return stockSnapshotFromRicambio(ricambio);
}
