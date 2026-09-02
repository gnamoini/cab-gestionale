import { shouldSkipGestionaleDirtyMark } from "@/lib/sync/gestionale-dirty-decision";

/** Gate unico per marcare dirty da polling/reconnect — delega a decideGestionaleDirty SSOT. */
export function shouldSkipOperationalDirtyMark(table: string, entityId?: string): boolean {
  return shouldSkipGestionaleDirtyMark({ table, entityId: entityId ?? null });
}
