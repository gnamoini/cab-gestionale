import type { AssetComplianceRuleRow, AssetTimelineProjectionRow } from "@/src/types/supabase-tables";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { ymdFromDate } from "@/lib/report/date-ranges";

export type AssetLifecycleKpiModel = {
  mezziWithUpcomingCompliance: Array<{
    mezzoId: string;
    ruleKind: string;
    dueAt: string;
    daysUntil: number;
  }>;
  attrezzatureFrequentReassign: Array<{
    attrezzaturaId: string;
    changeCount90d: number;
  }>;
  mezziIdleDays: Array<{
    mezzoId: string;
    daysSinceLastLavorazione: number;
  }>;
  kmAnomalies: Array<{
    mezzoId: string;
    deltaKm30d: number;
    avgDailyKm: number;
  }>;
  suggestedMaintenance: Array<{
    mezzoId: string;
    ruleKind: string;
    reason: string;
  }>;
  deterministicInsights: string[];
};

export type BuildAssetLifecycleKpiInput = {
  anchor: Date;
  timelineRows: AssetTimelineProjectionRow[];
  complianceRules: AssetComplianceRuleRow[];
  lavorazioni: LavorazioneListRow[];
};

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (86400000));
}

export function buildAssetLifecycleKpiModel(input: BuildAssetLifecycleKpiInput): AssetLifecycleKpiModel {
  const anchor = input.anchor;
  const todayYmd = ymdFromDate(anchor);

  const mezziWithUpcomingCompliance = input.complianceRules
    .filter((r) => r.is_active && r.next_due_at)
    .map((r) => {
      const due = new Date(`${r.next_due_at}T12:00:00`);
      return {
        mezzoId: r.mezzo_id ?? "",
        ruleKind: r.rule_kind,
        dueAt: r.next_due_at!,
        daysUntil: daysBetween(anchor, due),
      };
    })
    .filter((x) => x.mezzoId)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const reassignCounts = new Map<string, number>();
  const cutoff = new Date(anchor);
  cutoff.setDate(cutoff.getDate() - 90);
  for (const row of input.timelineRows) {
    if (row.event_category !== "assignment_start" && row.event_category !== "assignment_end") continue;
    if (!row.attrezzatura_id) continue;
    if (new Date(row.event_at) < cutoff) continue;
    reassignCounts.set(row.attrezzatura_id, (reassignCounts.get(row.attrezzatura_id) ?? 0) + 1);
  }
  const attrezzatureFrequentReassign = [...reassignCounts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([attrezzaturaId, changeCount90d]) => ({ attrezzaturaId, changeCount90d }));

  const lastLavByMezzo = new Map<string, string>();
  for (const lav of input.lavorazioni) {
    const at = lav.data_ingresso?.trim() || lav.created_at;
    if (!at) continue;
    const prev = lastLavByMezzo.get(lav.mezzo_id);
    if (!prev || at > prev) lastLavByMezzo.set(lav.mezzo_id, at);
  }
  const mezziIdleDays = [...lastLavByMezzo.entries()]
    .map(([mezzoId, at]) => ({
      mezzoId,
      daysSinceLastLavorazione: daysBetween(new Date(at), anchor),
    }))
    .filter((x) => x.daysSinceLastLavorazione >= 14)
    .sort((a, b) => b.daysSinceLastLavorazione - a.daysSinceLastLavorazione);

  const kmByMezzo = new Map<string, { first: number; last: number; firstAt: Date; lastAt: Date }>();
  for (const row of input.timelineRows) {
    if (row.event_category !== "mileage_reading" || !row.mezzo_id) continue;
    const km = Number.parseFloat(row.label.replace(/^Km\s+/i, ""));
    if (!Number.isFinite(km)) continue;
    const at = new Date(row.event_at);
    const cur = kmByMezzo.get(row.mezzo_id);
    if (!cur) {
      kmByMezzo.set(row.mezzo_id, { first: km, last: km, firstAt: at, lastAt: at });
    } else if (at < cur.firstAt) {
      kmByMezzo.set(row.mezzo_id, { ...cur, first: km, firstAt: at });
    } else if (at > cur.lastAt) {
      kmByMezzo.set(row.mezzo_id, { ...cur, last: km, lastAt: at });
    }
  }
  const kmAnomalies = [...kmByMezzo.entries()]
    .map(([mezzoId, v]) => {
      const spanDays = Math.max(1, daysBetween(v.firstAt, v.lastAt));
      const deltaKm30d = v.last - v.first;
      const avgDailyKm = deltaKm30d / spanDays;
      return { mezzoId, deltaKm30d, avgDailyKm };
    })
    .filter((x) => x.avgDailyKm > 800 || x.deltaKm30d < 0);

  const suggestedMaintenance = input.complianceRules
    .filter((r) => r.is_active && r.trigger_kind === "km_interval" && r.next_due_km != null && r.mezzo_id)
    .map((r) => ({
      mezzoId: r.mezzo_id!,
      ruleKind: r.rule_kind,
      reason: `Tagliando previsto a ${r.next_due_km} km`,
    }));

  const deterministicInsights: string[] = [];
  for (const c of mezziWithUpcomingCompliance.slice(0, 3)) {
    if (c.daysUntil <= 0) {
      deterministicInsights.push(`Revisione/compliance scaduta (${c.ruleKind}) — mezzo ${c.mezzoId.slice(0, 8)}…`);
    } else if (c.daysUntil <= 30) {
      deterministicInsights.push(`${c.ruleKind} tra ${c.daysUntil} giorni`);
    }
  }
  for (const idle of mezziIdleDays.slice(0, 2)) {
    deterministicInsights.push(`Mezzo fermo da ${idle.daysSinceLastLavorazione} giorni`);
  }
  for (const r of attrezzatureFrequentReassign.slice(0, 2)) {
    deterministicInsights.push(`Attrezzatura riassegnata ${r.changeCount90d} volte in 90 giorni`);
  }
  for (const k of kmAnomalies.slice(0, 2)) {
    deterministicInsights.push(`Chilometraggio anomalo su mezzo ${k.mezzoId.slice(0, 8)}… (${Math.round(k.avgDailyKm)} km/g)`);
  }

  return {
    mezziWithUpcomingCompliance,
    attrezzatureFrequentReassign,
    mezziIdleDays,
    kmAnomalies,
    suggestedMaintenance,
    deterministicInsights,
  };
}

export function lifecyclePriorityRank(p: string): number {
  if (p === "urgent") return 90;
  if (p === "high") return 75;
  if (p === "medium") return 55;
  return 30;
}

export function mapTimelineRowToCalendarEvent(row: AssetTimelineProjectionRow) {
  return {
    id: `life-${row.source_id}`,
    eventDomain: "lifecycle" as const,
    eventCategory: row.event_category,
    priority: row.priority,
    label: row.label,
    detail: row.event_subtype,
    at: row.event_at,
    assetRef: row.mezzo_id
      ? ({ kind: "mezzo" as const, id: row.mezzo_id })
      : row.attrezzatura_id
        ? ({ kind: "attrezzatura" as const, id: row.attrezzatura_id })
        : undefined,
    importance: lifecyclePriorityRank(row.priority),
  };
}
