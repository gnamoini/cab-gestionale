import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import { episodeIdsWithTemporalReturn, sumOreFromSchedeEpisodes } from "@/lib/report/recidivita/data-quality-audit";
import {
  computeRecidivitaScore,
  maxRecidivitaScoreBetween,
  type RecidivitaEpisodeInput,
} from "@/lib/report/recidivita/recidivita-score";
import {
  collectOperatorNamesFromBundle,
  computeOperatorAttributionPrecision,
  resolveOperatorIdentity,
} from "@/lib/report/recidivita/resolve-operator-identity";
import type {
  FleetRecidivitaKpi,
  RecidivaMezzoRankRow,
  RecidivitaWindowDays,
} from "@/lib/report/recidivita/types";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { MagazzinoRicambioRow, MovimentoRicambioRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type RecidivitaSelectorsInput = {
  completate: readonly LavorazioneArchiviata[];
  range: DateRange;
  windowDays: RecidivitaWindowDays;
  schedeStore: LavorazioneSchedeStore | null;
  movimenti: readonly MovimentoRicambioRow[];
  magazzinoRows: readonly MagazzinoRicambioRow[];
  addettiRecords: readonly AddettoRecord[];
};

function mezzoLabel(c: LavorazioneArchiviata): string {
  return [c.macchina, c.targa].filter(Boolean).join(" · ") || c.mezzoId || c.id;
}

function episodeInput(
  c: LavorazioneArchiviata,
  schedeStore: LavorazioneSchedeStore | null,
): RecidivitaEpisodeInput {
  return {
    dataIngresso: c.dataIngresso,
    dataCompletamento: c.dataCompletamento,
    bundle: schedeStore?.[c.id] ?? null,
  };
}

function priceByRicambioId(rows: readonly MagazzinoRicambioRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const prezzo = Number(r.prezzo_vendita ?? 0);
    if (prezzo > 0) map.set(r.id, prezzo);
  }
  return map;
}

export function sumCostoMovimenti(
  movimenti: readonly MovimentoRicambioRow[],
  lavIds: ReadonlySet<string>,
  prices: Map<string, number>,
): number {
  let sum = 0;
  for (const m of movimenti) {
    if (!m.lavorazione_id || !lavIds.has(m.lavorazione_id)) continue;
    if (m.tipo !== "uscita") continue;
    const prezzo = prices.get(m.ricambio_id) ?? 0;
    sum += prezzo * m.quantita;
  }
  return Math.round(sum * 100) / 100;
}

export function buildFleetRecidivitaKpi(input: RecidivitaSelectorsInput): FleetRecidivitaKpi {
  const { completate, range, windowDays, schedeStore, movimenti, magazzinoRows, addettiRecords } = input;
  const inRange = completate.filter(
    (c) => c.dataCompletamento && isoInRange(c.dataCompletamento, range),
  );
  const mezziSet = new Set(inRange.map((c) => c.mezzoId).filter(Boolean) as string[]);
  const returnIds = new Set(episodeIdsWithTemporalReturn(completate, windowDays));
  const returnInRange = inRange.filter((c) => returnIds.has(c.id));

  const prices = priceByRicambioId(magazzinoRows);
  const costoRitorni = sumCostoMovimenti(movimenti, returnIds, prices);
  const orePerse = sumOreFromSchedeEpisodes(
    returnInRange.map((c) => c.id),
    schedeStore,
  );

  const identities = [];
  for (const c of inRange) {
    for (const name of collectOperatorNamesFromBundle(schedeStore?.[c.id], addettiRecords)) {
      identities.push(resolveOperatorIdentity(name, addettiRecords));
    }
  }

  const ingressiTotali = inRange.length;
  const ritorniWindow = returnInRange.length;
  const indiceRecidivitaPct =
    ingressiTotali > 0 ? Math.round((ritorniWindow / ingressiTotali) * 1000) / 10 : 0;

  return {
    mezziAnalizzati: mezziSet.size,
    ingressiTotali,
    ritorniWindow,
    indiceRecidivitaPct,
    costoRitorni,
    orePerse,
    operatorAttributionPrecisionPct: computeOperatorAttributionPrecision(identities),
  };
}

export function listRecidivaMezziRanked(input: RecidivitaSelectorsInput, limit = 10): RecidivaMezzoRankRow[] {
  const { completate, range, windowDays, schedeStore } = input;
  const byMezzo = new Map<string, LavorazioneArchiviata[]>();

  for (const c of completate) {
    if (!c.mezzoId?.trim() || !c.dataCompletamento || !isoInRange(c.dataCompletamento, range)) continue;
    const list = byMezzo.get(c.mezzoId) ?? [];
    list.push(c);
    byMezzo.set(c.mezzoId, list);
  }

  const rows: RecidivaMezzoRankRow[] = [];
  for (const [mezzoId, episodes] of byMezzo) {
    const sorted = [...episodes].sort(
      (a, b) => new Date(a.dataCompletamento).getTime() - new Date(b.dataCompletamento).getTime(),
    );
    const inputs = sorted.map((c) => episodeInput(c, schedeStore));
    const breakdown = maxRecidivitaScoreBetween(inputs, windowDays);

    let ritorni = 0;
    let lastGap: number | null = null;
    for (let i = 1; i < sorted.length; i++) {
      const score = computeRecidivitaScore(inputs[i - 1]!, inputs[i]!, windowDays);
      if (score.temporal > 0) {
        ritorni += 1;
        const gap =
          (new Date(sorted[i]!.dataIngresso).getTime() -
            new Date(sorted[i - 1]!.dataCompletamento).getTime()) /
          86400000;
        lastGap = Math.round(gap);
      }
    }

    if (ritorni === 0 && breakdown.composite <= 0) continue;

    const last = sorted[sorted.length - 1]!;
    rows.push({
      mezzoId,
      mezzo: mezzoLabel(last),
      cliente: last.cliente.trim() || "—",
      interventi: sorted.length,
      ritorni,
      recidivitaScore: breakdown.composite,
      ultimoIntervento: last.dataCompletamento.slice(0, 10),
      giorniDaPrecedente: lastGap,
      breakdown,
    });
  }

  return rows.sort((a, b) => b.recidivitaScore - a.recidivitaScore || b.ritorni - a.ritorni).slice(0, limit);
}

export function countIngressiByMonth(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
): { label: string; value: number }[] {
  const buckets = new Map<string, number>();
  for (const c of completate) {
    if (!c.dataIngresso || !isoInRange(c.dataIngresso, range)) continue;
    const d = new Date(c.dataIngresso);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y!, m! - 1, 1).toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
      return { label, value };
    });
}
