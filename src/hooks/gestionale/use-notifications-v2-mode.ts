"use client";

import { useMemo } from "react";
import {
  readNotificationsV2ModeFromRows,
  resolveNotificationsV2Mode,
  notificationsV2ReadsDb,
  notificationsV2WritesDb,
  notificationsV2WritesLegacy,
  type NotificationsV2Mode,
} from "@/lib/notifications/notifications-v2-flag";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

export function useNotificationsV2Mode(): {
  mode: NotificationsV2Mode;
  readsDb: boolean;
  writesDb: boolean;
  writesLegacy: boolean;
  isLoading: boolean;
} {
  const { data: settingsPayload, isLoading } = useCabAppSettingsPayloadQuery({ tier: "static" });
  const dbMode = readNotificationsV2ModeFromRows(settingsPayload?.rows);
  const mode = resolveNotificationsV2Mode(dbMode);
  return useMemo(
    () => ({
      mode,
      readsDb: notificationsV2ReadsDb(mode),
      writesDb: notificationsV2WritesDb(mode),
      writesLegacy: notificationsV2WritesLegacy(mode),
      isLoading,
    }),
    [mode, isLoading],
  );
}
