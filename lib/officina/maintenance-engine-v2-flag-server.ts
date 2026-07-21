import "server-only";

import { cache } from "react";
import {
  MAINTENANCE_ENGINE_V2_KEY,
  MAINTENANCE_ENGINE_V2_MODULE,
  parseMaintenanceEngineV2Flags,
  resolveMaintenanceEngineV2Enabled,
  type MaintenanceEngineV2Flags,
} from "@/lib/officina/maintenance-engine-v2-flag";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const fetchMaintenanceEngineV2FlagsServer = cache(async (): Promise<MaintenanceEngineV2Flags> => {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("app_settings")
    .select("value")
    .eq("module", MAINTENANCE_ENGINE_V2_MODULE)
    .eq("key", MAINTENANCE_ENGINE_V2_KEY)
    .maybeSingle();
  if (error) return parseMaintenanceEngineV2Flags(null);
  return parseMaintenanceEngineV2Flags(data?.value);
});

export async function resolveMaintenanceEngineV2EnabledServer(input?: {
  userId?: string | null;
  userRole?: string | null;
}): Promise<boolean> {
  const dbFlags = await fetchMaintenanceEngineV2FlagsServer();
  return resolveMaintenanceEngineV2Enabled({
    dbFlags,
    userId: input?.userId,
    userRole: input?.userRole,
  });
}
