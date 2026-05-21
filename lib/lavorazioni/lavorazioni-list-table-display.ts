import { durataMsStorico, formatDurataMs } from "@/lib/lavorazioni/duration";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

export function lavorazioneDataCompletamentoIso(row: LavorazioneListRow): string {
  return (row.archived_at?.trim() || row.data_uscita?.trim() || row.updated_at) as string;
}

export function lavorazioneOreLavoroLabel(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): string {
  const ore = schedeStore?.[row.id]?.ingresso?.campi.oreLavoro?.trim();
  if (ore) return ore;
  const ms = durataMsStorico(
    (row.data_ingresso ?? row.created_at) as string,
    (row.archived_at ?? row.data_uscita ?? row.updated_at) as string,
  );
  if (ms <= 0) return "—";
  return formatDurataMs(ms);
}

export function lavorazioneOreLavoroSortMs(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): number {
  const ore = schedeStore?.[row.id]?.ingresso?.campi.oreLavoro?.trim();
  if (ore) {
    const n = parseFloat(ore.replace(",", "."));
    if (!Number.isNaN(n)) return n * 3_600_000;
  }
  return durataMsStorico(
    (row.data_ingresso ?? row.created_at) as string,
    (row.archived_at ?? row.data_uscita ?? row.updated_at) as string,
  );
}
