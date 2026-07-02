"use client";

import { useMemo } from "react";
import { resolveCalendarV2Enabled, readCalendarV2EnabledFromRows } from "@/lib/feature-flags/calendar-v2-flag";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

export function useCalendarV2Enabled(): boolean {
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });
  return useMemo(() => {
    const dbFlag = readCalendarV2EnabledFromRows(settingsQ.data?.rows);
    return resolveCalendarV2Enabled(dbFlag);
  }, [settingsQ.data?.rows]);
}
