import { getAddettoDisplayName, addettoRefFromFields } from "@/lib/lavorazioni/addetto-display";
import { LAVORAZIONE_EMPTY_DISPLAY } from "@/lib/lavorazioni/lavorazione-display-helpers";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { oreTotaliFromBundleLavorazioni } from "@/lib/lavorazioni/ore-totali-scheda";
import { extractComponentsFromBundle } from "@/lib/report/recidivita/component-match";
import { episodeIdsWithTemporalReturn } from "@/lib/report/recidivita/data-quality-audit";
import {
  collectOperatorNamesFromBundle,
  resolveOperatorIdentity,
} from "@/lib/report/recidivita/resolve-operator-identity";
import type { QualitaInterventiSegmentRow, RecidivitaWindowDays } from "@/lib/report/recidivita/types";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type QualitaInterventiInput = {
  completate: readonly LavorazioneArchiviata[];
  windowDays: RecidivitaWindowDays;
  schedeStore: LavorazioneSchedeStore | null;
  addettiRecords: readonly AddettoRecord[];
  minInterventi?: number;
};

import type { LavorazioneSchedeBundle } from "@/types/schede";

function complexityFactor(bundle: LavorazioneSchedeBundle | null | undefined): number {
  if (!bundle) return 1;
  const ricambi = bundle.ricambi?.campi.righe?.length ?? 0;
  const ore = oreTotaliFromBundleLavorazioni(bundle) ?? 0;
  const tecnici = new Set<string>();
  for (const r of bundle.lavorazioni?.campi.righe ?? []) {
    for (const a of r.addettiAssegnati ?? []) {
      if (a.addetto?.trim()) tecnici.add(a.addetto.trim());
    }
  }
  const raw = 1 + ricambi * 0.15 + ore * 0.05 + tecnici.size * 0.1;
  return Math.min(3, Math.max(1, Math.round(raw * 100) / 100));
}

function vehicleAgeFactor(annoMezzo: number | undefined, anchorYear: number): number {
  if (!annoMezzo || annoMezzo < 1970) return 1;
  const age = Math.max(0, anchorYear - annoMezzo);
  return Math.min(2, 1 + age * 0.03);
}

type SegmentAgg = {
  key: string;
  label: string;
  interventi: number;
  ritorni: number;
  complexitySum: number;
};

export function buildQualitaInterventiByOperatore(
  input: QualitaInterventiInput,
): QualitaInterventiSegmentRow[] {
  const { completate, windowDays, schedeStore, addettiRecords, minInterventi = 3 } = input;
  const returnIds = new Set(episodeIdsWithTemporalReturn(completate, windowDays));
  const bySegment = new Map<string, SegmentAgg>();

  for (const c of completate) {
    const bundle = schedeStore?.[c.id];
    let names = collectOperatorNamesFromBundle(bundle, addettiRecords);
    if (names.length === 0) {
      const fallback = c.addetto?.trim();
      if (fallback && fallback !== "—" && fallback !== LAVORAZIONE_EMPTY_DISPLAY) {
        names = [fallback];
      }
    }
    const cf = complexityFactor(bundle);
    const isReturn = returnIds.has(c.id);

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

    const cur = bySegment.get(key) ?? { key, label, interventi: 0, ritorni: 0, complexitySum: 0 };
    cur.interventi += 1;
    if (isReturn) cur.ritorni += 1;
    cur.complexitySum += cf;
    bySegment.set(key, cur);
  }

  const segments = [...bySegment.values()].filter((s) => s.interventi >= minInterventi);
  const baseline =
    segments.length > 0
      ? segments.reduce((sum, s) => sum + (s.interventi > 0 ? s.ritorni / s.interventi : 0), 0) /
        segments.length
      : 0;

  return segments
    .map((s) => {
      const returnRate = s.interventi > 0 ? s.ritorni / s.interventi : 0;
      const avgComplexity = s.complexitySum / s.interventi;
      const workloadFactor = Math.min(1, s.interventi / 20);
      const riskIndex =
        baseline > 0
          ? Math.round(
              ((returnRate * avgComplexity * workloadFactor) / baseline) * 100,
            ) / 100
          : 0;
      const vsOfficinaPct =
        baseline > 0 ? Math.round(((returnRate - baseline) / baseline) * 1000) / 10 : 0;
      return {
        segmentKey: s.key,
        segmentLabel: s.label,
        interventi: s.interventi,
        ritorni: s.ritorni,
        returnRate: Math.round(returnRate * 1000) / 10,
        riskIndex,
        complexityFactor: Math.round(avgComplexity * 100) / 100,
        vsOfficinaPct,
      };
    })
    .sort((a, b) => b.riskIndex - a.riskIndex);
}

export function buildQualitaInterventiByComponente(
  input: QualitaInterventiInput,
): QualitaInterventiSegmentRow[] {
  const { completate, windowDays, schedeStore, minInterventi = 2 } = input;
  const returnIds = new Set(episodeIdsWithTemporalReturn(completate, windowDays));
  const byComponent = new Map<string, SegmentAgg>();

  for (const c of completate) {
    const bundle = schedeStore?.[c.id];
    const components = extractComponentsFromBundle(bundle);
    const cf = complexityFactor(bundle);
    const isReturn = returnIds.has(c.id);

    if (components.length === 0) {
      const key = "nessun_ricambio";
      const cur = byComponent.get(key) ?? {
        key,
        label: "Nessun ricambio registrato",
        interventi: 0,
        ritorni: 0,
        complexitySum: 0,
      };
      cur.interventi += 1;
      if (isReturn) cur.ritorni += 1;
      cur.complexitySum += cf;
      byComponent.set(key, cur);
      continue;
    }

    for (const comp of components) {
      const key = comp.ricambioId ?? comp.ricambioNome.toLowerCase();
      const label = comp.ricambioNome || comp.ricambioId || key;
      const cur = byComponent.get(key) ?? { key, label, interventi: 0, ritorni: 0, complexitySum: 0 };
      cur.interventi += 1;
      if (isReturn) cur.ritorni += 1;
      cur.complexitySum += cf;
      byComponent.set(key, cur);
    }
  }

  const segments = [...byComponent.values()].filter((s) => s.interventi >= minInterventi);
  const baseline =
    segments.length > 0
      ? segments.reduce((sum, s) => sum + (s.interventi > 0 ? s.ritorni / s.interventi : 0), 0) /
        segments.length
      : 0;

  return segments
    .map((s) => {
      const returnRate = s.interventi > 0 ? s.ritorni / s.interventi : 0;
      const avgComplexity = s.complexitySum / s.interventi;
      const riskIndex =
        baseline > 0
          ? Math.round(((returnRate * avgComplexity) / baseline) * 100) / 100
          : 0;
      return {
        segmentKey: s.key,
        segmentLabel: s.label,
        interventi: s.interventi,
        ritorni: s.ritorni,
        returnRate: Math.round(returnRate * 1000) / 10,
        riskIndex,
        complexityFactor: Math.round(avgComplexity * 100) / 100,
        vsOfficinaPct:
          baseline > 0 ? Math.round(((returnRate - baseline) / baseline) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.riskIndex - a.riskIndex)
    .slice(0, 15);
}

export { complexityFactor, vehicleAgeFactor };
