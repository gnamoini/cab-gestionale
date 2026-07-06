"use client";

import type { QueryClient } from "@tanstack/react-query";
import {
  invalidateRbacTruthClient,
  type RefreshAuthFn,
} from "@/src/lib/rbac/invalidate-rbac-truth";

export async function onUserRoleChangedClient(
  userId: string,
  ctx: { currentUserId?: string; refresh: RefreshAuthFn; queryClient: QueryClient },
): Promise<void> {
  await invalidateRbacTruthClient({
    reason: "roleOrPermissionsChanged",
    queryClient: ctx.queryClient,
    affectedUserId: userId,
    currentUserId: ctx.currentUserId,
    refreshAuth: ctx.refresh,
  });
}
