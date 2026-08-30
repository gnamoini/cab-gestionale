import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { displayRicambioCodice } from "@/lib/magazzino/ricambio-codice";
import { aggregateMagazzinoQtyByProductInRange } from "@/lib/report/magazzino-period-aggregate";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { type DateRange } from "@/lib/report/date-ranges";

export type CoperturaRicambioRow = {
  id: string;
  codice: string;
  nome: string;
  qty: number;
  uscitePeriodo: number;
  giorniCopertura: number | null;
};

/** ponytail: giorni copertura = qty / (uscite/giorni periodo); O(n) scan, upgrade path RPC aggregata. */
export function buildGiorniCoperturaRicambi(
  magazzino: readonly RicambioMagazzino[],
  magLog: readonly MagazzinoChangeLogEntry[],
  range: DateRange,
  limit = 12,
): CoperturaRicambioRow[] {
  const periodDays = Math.max(
    1,
    Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000) + 1,
  );
  const agg = aggregateMagazzinoQtyByProductInRange([...magLog], range);
  const rows: CoperturaRicambioRow[] = [];

  for (const p of magazzino) {
    const uscite = agg.get(p.id)?.uscite ?? 0;
    const daily = uscite / periodDays;
    const giorniCopertura = daily > 0 ? Math.round((p.scorta / daily) * 10) / 10 : null;
    if (p.scorta <= 0 && uscite <= 0) continue;
    rows.push({
      id: p.id,
      codice: displayRicambioCodice(p.codiceFornitoreOriginale),
      nome: p.descrizione,
      qty: p.scorta,
      uscitePeriodo: uscite,
      giorniCopertura,
    });
  }

  return rows
    .filter((r) => r.giorniCopertura != null && r.giorniCopertura < 14)
    .sort((a, b) => (a.giorniCopertura ?? 999) - (b.giorniCopertura ?? 999))
    .slice(0, limit);
}

export function countSottoScortaDettaglio(magazzino: readonly RicambioMagazzino[]): CoperturaRicambioRow[] {
  return magazzino
    .filter((p) => p.scortaMinima > 0 && p.scorta < p.scortaMinima)
    .map((p) => ({
      id: p.id,
      codice: displayRicambioCodice(p.codiceFornitoreOriginale),
      nome: p.descrizione,
      qty: p.scorta,
      uscitePeriodo: 0,
      giorniCopertura: null,
    }))
    .sort((a, b) => a.qty - b.qty);
}
