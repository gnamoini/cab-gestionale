import { isOperationalBaselineAckPending } from "@/lib/sync/operational-data-version";
import { shouldSuppressRemoteCacheInvalidation } from "@/lib/sync/recent-local-mutation";

/** Gate unico per marcare dirty da polling/reconnect — stesso criterio del path realtime. */
export function shouldSkipOperationalDirtyMark(table: string, entityId?: string): boolean {
  if (isOperationalBaselineAckPending(table)) return true;
  return shouldSuppressRemoteCacheInvalidation(table, entityId);
}
