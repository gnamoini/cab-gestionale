import "server-only";

import { clearServerAuthSnapshotCacheForUser } from "@/src/lib/auth/server-session-cache";
import { invalidateServerRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth.server";

export function onUserRoleChangedServer(userId: string): void {
  clearServerAuthSnapshotCacheForUser(userId);
  invalidateServerRuntimeTruth();
}
