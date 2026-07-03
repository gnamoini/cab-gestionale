export const WORKSHOP_HISTORY_ACTIONS = [
  "created",
  "moved",
  "deleted",
  "linked",
  "unlinked",
  "duration_changed",
  "time_changed",
  "status_changed",
  "cancelled",
] as const;

export type WorkshopHistoryAction = (typeof WORKSHOP_HISTORY_ACTIONS)[number];

export function inferHistoryAction(before: Record<string, unknown> | null, after: Record<string, unknown> | null): WorkshopHistoryAction {
  if (!before && after) return "created";
  if (before && !after) return "deleted";
  if (!before || !after) return "time_changed";
  if (before.work_order_id !== after.work_order_id) {
    return after.work_order_id ? "linked" : "unlinked";
  }
  if (before.planning_status === "cancelled" || after.planning_status === "cancelled") return "cancelled";
  if (before.planning_status !== after.planning_status) return "status_changed";
  if (before.start_at !== after.start_at || before.end_at !== after.end_at) {
    if (before.start_at === after.start_at || before.end_at === after.end_at) return "duration_changed";
    return "moved";
  }
  return "time_changed";
}

export function planningSnapshot(session: Record<string, unknown>): Record<string, unknown> {
  const keys = [
    "title",
    "description",
    "event_type",
    "block_type",
    "start_at",
    "end_at",
    "planning_status",
    "priority",
    "work_order_id",
    "revision",
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in session) out[k] = session[k];
  }
  return out;
}
