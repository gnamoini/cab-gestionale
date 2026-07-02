"use client";

import { useMemo } from "react";
import {
  resolveAssetLifecycleV1Flags,
  readAssetLifecycleV1FromRows,
  type AssetLifecycleV1Flags,
} from "@/lib/officina/asset-lifecycle-v1-flag";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

export function useAssetLifecycleV1Enabled(): AssetLifecycleV1Flags {
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });
  return useMemo(() => {
    const dbFlags = readAssetLifecycleV1FromRows(settingsQ.data?.rows);
    return resolveAssetLifecycleV1Flags(dbFlags);
  }, [settingsQ.data?.rows]);
}
