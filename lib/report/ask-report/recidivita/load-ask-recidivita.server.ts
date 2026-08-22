import "server-only";

import { resolveCabAppSettingsResolvedServer } from "@/lib/app-settings/resolve-settings-for-server";
import { getAddettoDisplayName, addettoRefFromFields } from "@/lib/lavorazioni/addetto-display";
import { LAVORAZIONE_EMPTY_DISPLAY } from "@/lib/lavorazioni/lavorazione-display-helpers";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { buildReportLavorazioniBundle } from "@/lib/report/lavorazioni-report-selectors";
import { fetchRecidivitaInputsServer } from "@/lib/report/recidivita/fetch-recidivita-inputs.server";
import { episodeIdsWithTemporalReturn } from "@/lib/report/recidivita/data-quality-audit";
import { buildQualitaInterventiByOperatore } from "@/lib/report/recidivita/qualita-interventi";
import {
  collectOperatorNamesFromBundle,
  resolveOperatorIdentity,
} from "@/lib/report/recidivita/resolve-operator-identity";
import { listRecidivaMezziRanked } from "@/lib/report/recidivita/recidivita-selectors";
import type { RecidivitaWindowDays } from "@/lib/report/recidivita/types";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import type { DateRange } from "@/lib/report/date-ranges";

export type AskRecidivitaRankBy = "ritorni" | "mezzi_con_ritorno" | "risk_index";
export type AskRecidivitaSubject = "operatore" | "mezzo" | "fleet";

export type AskRecidivitaOperatorRow = {
  operatoreKey: string;
  operatore: string;
  interventi: number;
  ritorni: number;
  mezziConRitorno: number;
  returnRatePct: number;
  riskIndex: number;
};

export type AskRecidivitaMezzoRow = {
  mezzoId: string;
  mezzo: string;
  cliente: string;
  interventi: number;
  ritorni: number;
  recidivitaScorePct: number;
};

export type AskRecidivitaToolData = {
  subject: AskRecidivitaSubject;
  rankBy: AskRecidivitaRankBy;
  windowDays: RecidivitaWindowDays;
  periodLabel: string;
  operatori?: AskRecidivitaOperatorRow[];
  mezzi?: AskRecidivitaMezzoRow[];
  fleetSummary?: {
    mezziAnalizzati: number;
    ingressiTotali: number;
    ritorniWindow: number;
    indiceRecidivitaPct: number;
  };
  dataWarnings: string[];
};

function periodToRange(period: ReportRequestedPeriod): DateRange {
  return {
    start: new Date(`${period.start}T00:00:00`),
    end: new Date(`${period.end}T23:59:59`),
  };
}

function resolveOperatorLabel(
  names: string[],
  addettiRecords: readonly import("@/lib/lavorazioni/addetto-model").AddettoRecord[],
): { key: string; label: string } {
  const resolved = names.map((n) => resolveOperatorIdentity(n, addettiRecords));
  const primary = resolved.find((r) => r.addettoId) ?? resolved[0];
  const key = primary?.addettoId ?? `unknown:${primary?.storedName ?? "—"}`;
  const label =
    getAddettoDisplayName(
      addettiRecords,
      addettoRefFromFields({
        addettoId: primary?.addettoId,
        addettoLegacy: primary?.addettoId ? null : primary?.storedName,
      }),
    ) ||
    primary?.storedName?.trim() ||
    "Operatore non attribuito";
  return { key, label };
}

function rankOperatoriByMezziConRitorno(input: {
  completate: readonly LavorazioneArchiviata[];
  windowDays: RecidivitaWindowDays;
  schedeStore: import("@/types/schede").LavorazioneSchedeStore | null;
  addettiRecords: readonly import("@/lib/lavorazioni/addetto-model").AddettoRecord[];
}): AskRecidivitaOperatorRow[] {
  const returnIds = new Set(episodeIdsWithTemporalReturn(input.completate, input.windowDays));
  const byOp = new Map<
    string,
    { label: string; interventi: number; ritorni: number; mezzi: Set<string> }
  >();

  for (const c of input.completate) {
    const bundle = input.schedeStore?.[c.id];
    let names = collectOperatorNamesFromBundle(bundle, input.addettiRecords);
    if (names.length === 0) {
      const fallback = c.addetto?.trim();
      if (fallback && fallback !== "—" && fallback !== LAVORAZIONE_EMPTY_DISPLAY) {
        names = [fallback];
      }
    }
    if (!names.length) continue;
    const { key, label } = resolveOperatorLabel(names, input.addettiRecords);
    const cur = byOp.get(key) ?? { label, interventi: 0, ritorni: 0, mezzi: new Set<string>() };
    cur.interventi += 1;
    if (returnIds.has(c.id)) {
      cur.ritorni += 1;
      if (c.mezzoId?.trim()) cur.mezzi.add(c.mezzoId);
    }
    byOp.set(key, cur);
  }

  return [...byOp.entries()]
    .map(([operatoreKey, s]) => ({
      operatoreKey,
      operatore: s.label,
      interventi: s.interventi,
      ritorni: s.ritorni,
      mezziConRitorno: s.mezzi.size,
      returnRatePct: s.interventi > 0 ? Math.round((s.ritorni / s.interventi) * 1000) / 10 : 0,
      riskIndex: 0,
    }))
    .filter((r) => r.interventi >= 3)
    .sort((a, b) => b.mezziConRitorno - a.mezziConRitorno || b.ritorni - a.ritorni);
}

export async function loadAskRecidivitaData(input: {
  period: ReportRequestedPeriod;
  subject: AskRecidivitaSubject;
  rankBy: AskRecidivitaRankBy;
  windowDays: RecidivitaWindowDays;
  limit?: number;
}): Promise<AskRecidivitaToolData> {
  const range = periodToRange(input.period);
  const limit = input.limit ?? 5;
  const [{ lavRows, schedeStore }, settings] = await Promise.all([
    fetchRecidivitaInputsServer(range),
    resolveCabAppSettingsResolvedServer(),
  ]);
  const addettiRecords = settings.lavorazioni.addettiRecords ?? [];
  const { completate } = buildReportLavorazioniBundle(lavRows, lavRows);
  const selectorInput = {
    completate,
    range,
    windowDays: input.windowDays,
    schedeStore,
    movimenti: [] as const,
    magazzinoRows: [] as const,
    addettiRecords,
  };

  const dataWarnings: string[] = [];
  if (!completate.length) {
    dataWarnings.push("Nessuna lavorazione completata nel periodo selezionato.");
  }

  const periodLabel = `${input.period.start} – ${input.period.end}`;

  if (input.subject === "fleet") {
    const { buildFleetRecidivitaKpi } = await import("@/lib/report/recidivita/recidivita-selectors");
    const fleet = buildFleetRecidivitaKpi(selectorInput);
    return {
      subject: "fleet",
      rankBy: input.rankBy,
      windowDays: input.windowDays,
      periodLabel,
      fleetSummary: {
        mezziAnalizzati: fleet.mezziAnalizzati,
        ingressiTotali: fleet.ingressiTotali,
        ritorniWindow: fleet.ritorniWindow,
        indiceRecidivitaPct: fleet.indiceRecidivitaPct,
      },
      dataWarnings,
    };
  }

  if (input.subject === "mezzo") {
    const ranked = listRecidivaMezziRanked(selectorInput, limit);
    return {
      subject: "mezzo",
      rankBy: input.rankBy,
      windowDays: input.windowDays,
      periodLabel,
      mezzi: ranked.map((r) => ({
        mezzoId: r.mezzoId,
        mezzo: r.mezzo,
        cliente: r.cliente,
        interventi: r.interventi,
        ritorni: r.ritorni,
        recidivitaScorePct: Math.round(r.recidivitaScore * 100),
      })),
      dataWarnings,
    };
  }

  let operatori: AskRecidivitaOperatorRow[];

  if (input.rankBy === "mezzi_con_ritorno") {
    operatori = rankOperatoriByMezziConRitorno({
      completate,
      windowDays: input.windowDays,
      schedeStore,
      addettiRecords,
    });
  } else {
    const qualita = buildQualitaInterventiByOperatore({
      completate,
      windowDays: input.windowDays,
      schedeStore,
      addettiRecords,
      minInterventi: 3,
    });
    operatori = qualita.map((q) => ({
      operatoreKey: q.segmentKey,
      operatore: q.segmentLabel,
      interventi: q.interventi,
      ritorni: q.ritorni,
      mezziConRitorno: 0,
      returnRatePct: q.returnRate,
      riskIndex: q.riskIndex,
    }));
    if (input.rankBy === "risk_index") {
      operatori.sort((a, b) => b.riskIndex - a.riskIndex);
    } else {
      operatori.sort((a, b) => b.ritorni - a.ritorni || b.returnRatePct - a.returnRatePct);
    }
  }

  return {
    subject: "operatore",
    rankBy: input.rankBy,
    windowDays: input.windowDays,
    periodLabel,
    operatori: operatori.slice(0, limit),
    dataWarnings,
  };
}
