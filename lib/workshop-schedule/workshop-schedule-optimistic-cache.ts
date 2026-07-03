import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";

export type WorkshopScheduleCacheSnapshot = {
  queryKey: readonly unknown[];
  data: WorkshopScheduleSessionView[] | undefined;
};

export function snapshotWorkshopScheduleQueries(
  getQueries: () => Array<[readonly unknown[], WorkshopScheduleSessionView[] | undefined]>,
): WorkshopScheduleCacheSnapshot[] {
  return getQueries().map(([queryKey, data]) => ({ queryKey, data }));
}

export function applyOptimisticSession(
  sessions: WorkshopScheduleSessionView[] | undefined,
  updated: WorkshopScheduleSessionView,
): WorkshopScheduleSessionView[] {
  const prev = sessions ?? [];
  const idx = prev.findIndex((s) => s.id === updated.id);
  if (idx === -1) return sortInsert(prev, updated);
  const next = [...prev];
  next[idx] = updated;
  return next;
}

export function removeOptimisticSession(
  sessions: WorkshopScheduleSessionView[] | undefined,
  id: string,
): WorkshopScheduleSessionView[] {
  return (sessions ?? []).filter((s) => s.id !== id);
}

function sortInsert(list: WorkshopScheduleSessionView[], item: WorkshopScheduleSessionView): WorkshopScheduleSessionView[] {
  return [...list, item].sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function rollbackWorkshopScheduleSnapshots(
  setData: (key: readonly unknown[], data: WorkshopScheduleSessionView[] | undefined) => void,
  snapshots: WorkshopScheduleCacheSnapshot[],
): void {
  for (const s of snapshots) setData(s.queryKey, s.data);
}
