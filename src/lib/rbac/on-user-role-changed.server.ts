import "server-only";

import { invalidateRbacTruthServer } from "@/src/lib/rbac/invalidate-rbac-truth.server";

export function onUserRoleChangedServer(userId: string): void {
  invalidateRbacTruthServer({ affectedUserId: userId });
}
