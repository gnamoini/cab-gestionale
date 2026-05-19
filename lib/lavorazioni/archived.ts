import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";

/** True se la lavorazione è stata archiviata manualmente (portale / storico). */
export function isLavorazioneArchived(row: Pick<LavorazioneRow, "archived">): boolean {
  return row.archived === true;
}

export function isLavorazioneInCorso(row: Pick<LavorazioneRow, "archived">): boolean {
  return row.archived !== true;
}
