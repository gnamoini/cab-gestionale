"use client";

import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { resolveVisibleDashboardWidgets } from "@/lib/dashboard/dashboard-widget-registry";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";

export function useVisibleDashboardWidgets() {
  const { snapshot, isLoading } = useEffectivePermissions();
  const staging = isStagingPublicSlice();
  const widgets = snapshot
    ? resolveVisibleDashboardWidgets({ modules: snapshot.modules, staging })
    : [];
  return { widgets, isLoading, staging };
}
