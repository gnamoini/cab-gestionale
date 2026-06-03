import { entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

export type AbsenceMotivoAggregate = {
  label: string;
  oreAssenza: number;
  giorni: number;
};

export type DipendenteSchedaStats = {
  giorniLavorati: number;
  giorniAssenza: number;
  mediaOreGiorno: number;
  motiviAssenza: AbsenceMotivoAggregate[];
};

export function computeDipendenteSchedaStats(entries: readonly DipendenteTimesheetEntryRow[]): DipendenteSchedaStats {
  let giorniLavorati = 0;
  let giorniAssenza = 0;
  let totaleLavorato = 0;
  const motiviMap = new Map<string, { oreAssenza: number; giorni: number }>();

  for (const e of entries) {
    const cell = entryToCellValue(e);
    const lavorato = cell.oreOrdinarie + cell.oreStraordinarie;
    if (lavorato > 0) {
      giorniLavorati += 1;
      totaleLavorato += lavorato;
    }
    if (cell.oreAssenza > 0) {
      giorniAssenza += 1;
      const label = cell.tipoAssenzaLabel || cell.motivoCustom || "Assenza";
      const prev = motiviMap.get(label) ?? { oreAssenza: 0, giorni: 0 };
      motiviMap.set(label, {
        oreAssenza: Math.round((prev.oreAssenza + cell.oreAssenza) * 100) / 100,
        giorni: prev.giorni + 1,
      });
    }
  }

  const motiviAssenza = [...motiviMap.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.oreAssenza - a.oreAssenza || a.label.localeCompare(b.label, "it"));

  const mediaOreGiorno =
    giorniLavorati > 0 ? Math.round((totaleLavorato / giorniLavorati) * 100) / 100 : 0;

  return { giorniLavorati, giorniAssenza, mediaOreGiorno, motiviAssenza };
}
