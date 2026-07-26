"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { refreshDashboardQueries } from "@/lib/dashboard/refresh-dashboard-queries";

export function useDashboardRefresh() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await refreshDashboardQueries(queryClient);
    } finally {
      setBusy(false);
    }
  }, [busy, queryClient]);

  return { refresh, busy };
}
