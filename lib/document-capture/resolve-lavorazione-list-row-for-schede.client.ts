import { lavorazioniService, type LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { mezziService } from "@/src/services/mezzi.service";

/** ponytail: O(n) scan per lista; upgrade path = indice per id se diventa hot path */
export async function resolveLavorazioneListRowForSchedeOpen(
  lavorazioneId: string,
  attiveRows: readonly LavorazioneListRow[],
  refetchAttive: () => Promise<{ data?: readonly LavorazioneListRow[] } | void>,
): Promise<LavorazioneListRow | null> {
  const id = lavorazioneId.trim();
  if (!id) return null;

  const find = (rows: readonly LavorazioneListRow[]) => rows.find((r) => r.id === id) ?? null;

  let row = find(attiveRows);
  if (row) return row;

  const direct = await lavorazioniService.getById(id);
  if (direct.success && direct.data) {
    let mezzo = null;
    if (direct.data.mezzo_id) {
      const mezzoRes = await mezziService.getById(direct.data.mezzo_id);
      if (mezzoRes.success) mezzo = mezzoRes.data;
    }
    return { ...direct.data, mezzo };
  }

  const refreshed = await refetchAttive();
  row = find(refreshed?.data ?? []);
  if (row) return row;

  return null;
}
