"use client";

/* eslint-disable @next/next/no-assign-module-variable -- lint phase2: dynamic import interop requires module handle */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useRbac } from "@/src/hooks/use-rbac";
import { QK } from "@/src/lib/react-query/invalidate-related";
import {
  appSettingsAuditEntry,
  type AppSettingsAuditListParams,
} from "@/lib/domain/app-settings-audit-entry";
import type { AppSettingsAuditRow } from "@/src/types/supabase-tables";

/**
 * Pronto per una futura pagina log admin: esegue fetch solo se `ruolo === 'admin'`.
 */
export function useAppSettingsAuditQuery(
  params: AppSettingsAuditListParams = {},
): UseQueryResult<AppSettingsAuditRow[], Error> {
  const { user } = useAuth();
  const rbac = useRbac();
  const limit = params.limit ?? 200;
  const module = params.module ?? "";
  const key = params.key ?? "";

  return useQuery({
    queryKey: [...QK.settingsAudit, module, key, limit] as const,
    queryFn: async () => {
      const r = await appSettingsAuditEntry.list({ ...params, limit });
      if (!r.success) throw new Error(r.error ?? "Errore lettura audit impostazioni");
      return r.data ?? [];
    },
    enabled: !!user?.id && rbac.canWritePage("sicurezza"),
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
