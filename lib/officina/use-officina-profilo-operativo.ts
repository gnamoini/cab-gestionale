"use client";

import { useMemo } from "react";
import {
  readOfficinaProfiloFromRows,
  type OfficinaProfiloOperativo,
} from "@/lib/officina/officina-profilo-operativo";
import { useSharedAppSettingsQuery } from "@/src/context/app-settings-query-context";
import { getRuntimeCabAppSettingsPayload } from "@/src/lib/app-settings/runtime-settings-cache";

export function useOfficinaProfiloOperativo(): OfficinaProfiloOperativo {
  const settingsQ = useSharedAppSettingsQuery();
  const rows = settingsQ?.data?.rows ?? getRuntimeCabAppSettingsPayload()?.rows;
  return useMemo(() => readOfficinaProfiloFromRows(rows), [rows]);
}
