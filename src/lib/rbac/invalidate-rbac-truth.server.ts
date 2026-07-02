import "server-only";

import {
  clearServerAuthSnapshotCache,
  clearServerAuthSnapshotCacheForUser,
} from "@/src/lib/auth/server-session-cache";
import { invalidateServerRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth.server";

export type InvalidateRbacTruthServerOptions = {
  affectedUserId?: string;
};

/** Hub server: invalida cache auth server + layout RSC. */
export function invalidateRbacTruthServer(opts?: InvalidateRbacTruthServerOptions): void {
  if (opts?.affectedUserId) clearServerAuthSnapshotCacheForUser(opts.affectedUserId);
  else clearServerAuthSnapshotCache();
  invalidateServerRuntimeTruth();
}
