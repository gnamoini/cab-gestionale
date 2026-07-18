"use client";

import { useEffect, useMemo } from "react";
import {
  resolveGestionaleDirtySyncMode,
  readGestionaleDirtySyncModeFromRows,
  setGestionaleDirtySyncModeRuntime,
} from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

/** Sincronizza feature flag dirty sync da env / app_settings al runtime module. */
export function useGestionaleDirtySyncMode(): void {
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });
  const mode = useMemo(() => {
    const dbMode = readGestionaleDirtySyncModeFromRows(settingsQ.data?.rows);
    return resolveGestionaleDirtySyncMode(dbMode);
  }, [settingsQ.data?.rows]);

  useEffect(() => {
    setGestionaleDirtySyncModeRuntime(mode);
  }, [mode]);
}
