import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { isLavorazioneArchived } from "@/lib/lavorazioni/archived";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { oreTotaliFromBundleLavorazioni } from "@/lib/lavorazioni/ore-totali-scheda";
import {
  collectOperatorNamesFromBundle,
  computeOperatorAttributionPrecision,
  resolveOperatorIdentity,
} from "@/lib/report/recidivita/resolve-operator-identity";
import type { DataQualityAuditResult } from "@/lib/report/recidivita/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

export const DATA_QUALITY_THRESHOLDS = {
  mezzoIdMissingPct: 5,
  closedWithoutUscitaPct: 2,
  ingressoSchedaMissingPct: 10,
  operatorResolvablePct: 75,
  ricambiWithMovementPct: 60,
} as const;

export type DataQualityAuditInput = {
  lavRows: readonly LavorazioneListRow[];
  schedeStore: LavorazioneSchedeStore | null;
  movimenti: readonly MovimentoRicambioRow[];
  addettiRecords: readonly AddettoRecord[];
};

export function auditDataQuality(input: DataQualityAuditInput): DataQualityAuditResult {
  const { lavRows, schedeStore, movimenti, addettiRecords } = input;
  const episodes = lavRows.filter((r) => !r.deleted_at);
  const total = episodes.length;

  let withoutMezzoId = 0;
  let closedWithoutUscita = 0;
  let withoutIngressoScheda = 0;
  const operatorIdentities: ReturnType<typeof resolveOperatorIdentity>[] = [];
  let ricambiRowsTotal = 0;
  let ricambiRowsWithMovement = 0;

  const movByLav = new Map<string, number>();
  for (const m of movimenti) {
    if (!m.lavorazione_id || m.tipo !== "uscita") continue;
    movByLav.set(m.lavorazione_id, (movByLav.get(m.lavorazione_id) ?? 0) + 1);
  }

  for (const row of episodes) {
    if (!row.mezzo_id?.trim()) withoutMezzoId += 1;
    const archived = isLavorazioneArchived(row);
    if (archived && !row.data_uscita?.trim()) closedWithoutUscita += 1;

    const bundle = schedeStore?.[row.id];
    if (!bundle?.ingresso) withoutIngressoScheda += 1;

    for (const name of collectOperatorNamesFromBundle(bundle)) {
      operatorIdentities.push(resolveOperatorIdentity(name, addettiRecords));
    }

    const ricambiRows = bundle?.ricambi?.campi.righe ?? [];
    ricambiRowsTotal += ricambiRows.length;
    const hasMov = (movByLav.get(row.id) ?? 0) > 0;
    if (hasMov && ricambiRows.length > 0) ricambiRowsWithMovement += ricambiRows.length;
  }

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
  const ricambiPct =
    ricambiRowsTotal > 0 ? Math.round((ricambiRowsWithMovement / ricambiRowsTotal) * 1000) / 10 : 100;
  const operatorResolvablePct = computeOperatorAttributionPrecision(operatorIdentities);

  const warnings: string[] = [];
  const withoutMezzoIdPct = pct(withoutMezzoId);
  const closedWithoutUscitaPct = pct(closedWithoutUscita);
  const withoutIngressoSchedaPct = pct(withoutIngressoScheda);

  if (withoutMezzoIdPct > DATA_QUALITY_THRESHOLDS.mezzoIdMissingPct) {
    warnings.push(`Lavorazioni senza mezzo_id: ${withoutMezzoIdPct}% (soglia ${DATA_QUALITY_THRESHOLDS.mezzoIdMissingPct}%)`);
  }
  if (closedWithoutUscitaPct > DATA_QUALITY_THRESHOLDS.closedWithoutUscitaPct) {
    warnings.push(`Chiuse senza data uscita: ${closedWithoutUscitaPct}%`);
  }
  if (withoutIngressoSchedaPct > DATA_QUALITY_THRESHOLDS.ingressoSchedaMissingPct) {
    warnings.push(`Senza scheda ingresso: ${withoutIngressoSchedaPct}%`);
  }
  if (operatorResolvablePct < DATA_QUALITY_THRESHOLDS.operatorResolvablePct) {
    warnings.push(`Precisione operatori: ${operatorResolvablePct}% (soglia ${DATA_QUALITY_THRESHOLDS.operatorResolvablePct}%)`);
  }
  if (ricambiPct < DATA_QUALITY_THRESHOLDS.ricambiWithMovementPct) {
    warnings.push(`Ricambi con movimento magazzino: ${ricambiPct}%`);
  }

  return {
    totalEpisodes: total,
    withoutMezzoId,
    withoutMezzoIdPct,
    closedWithoutUscita,
    closedWithoutUscitaPct,
    withoutIngressoScheda,
    withoutIngressoSchedaPct,
    operatorResolvable: operatorIdentities.filter(
      (i) => i.confidence === "high" || i.confidence === "medium",
    ).length,
    operatorResolvablePct: operatorResolvablePct,
    ricambiRowsWithMovement,
    ricambiRowsTotal,
    ricambiWithMovementPct: ricambiPct,
    warnings,
  };
}

export function sumOreFromSchedeEpisodes(
  episodeIds: readonly string[],
  schedeStore: LavorazioneSchedeStore | null,
): number {
  let sum = 0;
  for (const id of episodeIds) {
    const bundle = schedeStore?.[id];
    if (!bundle) continue;
    const ore = oreTotaliFromBundleLavorazioni(bundle);
    if (ore != null) sum += ore;
  }
  return Math.round(sum * 100) / 100;
}

export function episodeIdsWithTemporalReturn(
  completate: readonly LavorazioneArchiviata[],
  windowDays: number,
): string[] {
  const byMezzo = new Map<string, LavorazioneArchiviata[]>();
  for (const c of completate) {
    if (!c.mezzoId?.trim() || !c.dataCompletamento) continue;
    const list = byMezzo.get(c.mezzoId) ?? [];
    list.push(c);
    byMezzo.set(c.mezzoId, list);
  }
  const windowMs = windowDays * 86400000;
  const ids = new Set<string>();
  for (const rows of byMezzo.values()) {
    const sorted = [...rows].sort(
      (a, b) => new Date(a.dataCompletamento).getTime() - new Date(b.dataCompletamento).getTime(),
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const next = sorted[i]!;
      const gap = new Date(next.dataIngresso).getTime() - new Date(prev.dataCompletamento).getTime();
      if (gap >= 0 && gap <= windowMs) ids.add(next.id);
    }
  }
  return [...ids];
}
