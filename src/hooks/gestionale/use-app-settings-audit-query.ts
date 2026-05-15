"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { QK } from "@/src/lib/react-query/invalidate-related";
import {
  appSettingsAuditService,
  type AppSettingsAuditListParams,
} from "@/src/services/app-settings-audit.service";
import type { AppSettingsAuditRow } from "@/src/types/supabase-tables";

/**
 * Pronto per una futura pagina log admin: esegue fetch solo se `ruolo === 'admin'`.
 */
export function useAppSettingsAuditQuery(
  params: AppSettingsAuditListParams = {},
): UseQueryResult<AppSettingsAuditRow[], Error> {
  const { user } = useAuth();
  const limit = params.limit ?? 200;
  const module = params.module ?? "";
  const key = params.key ?? "";

  return useQuery({
    queryKey: [...QK.settingsAudit, module, key, limit] as const,
    queryFn: async () => {
      const r = await appSettingsAuditService.list({ ...params, limit });
      if (!r.success) throw new Error(r.error ?? "Errore lettura audit impostazioni");
      return r.data ?? [];
    },
    enabled: user?.ruolo === "admin",
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
