"use client";

import type { QueryClient } from "@tanstack/react-query";
import { clearClientEffectivePermissionsSnapshotCache } from "@/src/lib/runtime/truth-layer/client-effective-permissions-cache";
import { invalidateRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";

export async function onUserRoleChangedClient(
  userId: string,
  ctx: { currentUserId?: string; refresh: () => Promise<void>; queryClient: QueryClient },
): Promise<void> {
  clearClientEffectivePermissionsSnapshotCache();
  await invalidateRuntimeTruth({ reason: "roleOrPermissionsChanged", queryClient: ctx.queryClient });
  if (ctx.currentUserId === userId) await ctx.refresh();
}
