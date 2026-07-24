import { reconcileLogModificaRows, LOG_AGGREGATION_WINDOW_MS } from "@/lib/gestionale-log/log-event-pipeline";
import { buildLogModificaSummary } from "@/lib/gestionale-log/log-summary";
import { activityFeedEventLabelFromGroup } from "@/lib/gestionale-log/view-model";
import { buildLogModificheDisplayEntries, logAutoreLabel } from "@/lib/gestionale-log/log-modifiche-view-model";
import { scoreActivity } from "@/lib/audit/score-activity";
import { DEFAULT_AUDIT_RETENTION_CONFIG } from "@/lib/audit/types";
import type { LogModificaRow, LogModificaWithProfileRow } from "@/src/types/supabase-tables";

export type RecentActivityItem = {
  id: string;
  score: number;
  createdAt: string;
  eventLabel: string;
  entita: string;
  entitaId: string;
  eventType: string | null;
  correlationId: string | null;
  rowCount: number;
};

export type GetRecentActivitiesInput = {
  rows: readonly LogModificaRow[];
  roleKey?: string;
  limit?: number;
  windowDays?: number;
  minScore?: number;
  now?: number;
};

function isSecurityNoise(row: LogModificaRow, roleKey?: string): boolean {
  if (row.entita !== "security") return false;
  return roleKey !== "admin" && roleKey !== "manager";
}

function withinWindow(row: LogModificaRow, windowDays: number, now: number): boolean {
  const ts = Date.parse(row.created_at);
  if (!Number.isFinite(ts)) return false;
  return now - ts <= windowDays * 86_400_000;
}

export function getRecentActivities(input: GetRecentActivitiesInput): RecentActivityItem[] {
  const limit = input.limit ?? 50;
  const windowDays = input.windowDays ?? DEFAULT_AUDIT_RETENTION_CONFIG.dashboard_days;
  const minScore = input.minScore ?? 5;
  const now = input.now ?? Date.now();

  const filtered = input.rows.filter((row) => {
    if (!withinWindow(row, windowDays, now)) return false;
    if (isSecurityNoise(row, input.roleKey)) return false;
    const eventType = (row as LogModificaRow & { event_type?: string }).event_type;
    if (eventType === "SYSTEM_EVENT") return false;
    return true;
  });

  const reconciled = reconcileLogModificaRows(filtered);

  const correlationGroups = new Map<string, LogModificaRow[]>();
  const standalone: LogModificaRow[] = [];

  for (const row of reconciled) {
    const cid = (row as LogModificaRow & { correlation_id?: string }).correlation_id;
    if (cid) {
      const list = correlationGroups.get(cid) ?? [];
      list.push(row);
      correlationGroups.set(cid, list);
    } else {
      standalone.push(row);
    }
  }

  const items: RecentActivityItem[] = [];

  for (const row of standalone) {
    const score = scoreActivity(row, now);
    if (score < minScore) continue;
    const vm = buildLogModificheDisplayEntries([row as LogModificaWithProfileRow], (r) =>
      logAutoreLabel(r, null, "Sistema"),
    )[0];
    items.push({
      id: row.id,
      score,
      createdAt: row.created_at,
      eventLabel: vm?.vm.tipoRiga ?? buildLogModificaSummary({
        entita: row.entita,
        entita_id: row.entita_id,
        azione: row.azione,
        payload: row.payload,
      }).tipoRiga,
      entita: row.entita,
      entitaId: row.entita_id,
      eventType: (row as LogModificaRow & { event_type?: string }).event_type ?? null,
      correlationId: null,
      rowCount: 1,
    });
  }

  for (const [correlationId, group] of correlationGroups) {
    const sorted = [...group].sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    );
    const lead = sorted[0]!;
    const score = Math.max(...sorted.map((r) => scoreActivity(r, now)));
    if (score < minScore) continue;
    const vms = buildLogModificheDisplayEntries(sorted as LogModificaWithProfileRow[], (r) =>
      logAutoreLabel(r, null, "Sistema"),
    );
    const eventLabel = activityFeedEventLabelFromGroup(vms[0]!.vm, sorted);
    items.push({
      id: lead.id,
      score,
      createdAt: lead.created_at,
      eventLabel,
      entita: lead.entita,
      entitaId: lead.entita_id,
      eventType: (lead as LogModificaRow & { event_type?: string }).event_type ?? "IMPORT_EVENT",
      correlationId,
      rowCount: sorted.length,
    });
  }

  items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  return items.slice(0, limit);
}

export { LOG_AGGREGATION_WINDOW_MS };
