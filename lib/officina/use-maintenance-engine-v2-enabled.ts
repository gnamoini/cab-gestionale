"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import {
  readMaintenanceEngineV2FromRows,
  resolveMaintenanceEngineV2Enabled,
} from "@/lib/officina/maintenance-engine-v2-flag";
import { getRuntimeCabAppSettingsPayload } from "@/src/lib/app-settings/runtime-settings-cache";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

export function resolveMaintenanceEngineV2EnabledClient(input?: {
  userId?: string | null;
  userRole?: string | null;
}): boolean {
  const rows = getRuntimeCabAppSettingsPayload()?.rows;
  return resolveMaintenanceEngineV2Enabled({
    dbFlags: readMaintenanceEngineV2FromRows(rows),
    userId: input?.userId,
    userRole: input?.userRole,
  });
}

/** Env kill switch + `app_settings` rollout (percentage, allowed_roles). */
export function useMaintenanceEngineV2Enabled(): boolean {
  const { user } = useAuth();
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });
  return useMemo(
    () =>
      resolveMaintenanceEngineV2Enabled({
        dbFlags: readMaintenanceEngineV2FromRows(settingsQ.data?.rows),
        userId: user?.id,
        userRole: user?.roleKey ?? user?.ruolo,
      }),
    [settingsQ.data?.rows, user?.id, user?.roleKey, user?.ruolo],
  );
}
