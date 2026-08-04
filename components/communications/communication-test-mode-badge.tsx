"use client";

import { parseCommunicationSettings, readCommunicationSettingsFromRows } from "@/lib/communications/settings/communication-settings";
import { useSharedAppSettingsQuery } from "@/src/context/app-settings-query-context";

export function CommunicationTestModeBadge() {
  const settingsQ = useSharedAppSettingsQuery();
  const settings = readCommunicationSettingsFromRows(settingsQ?.data?.rows);
  if (!settings.testMode) return null;

  return (
    <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      EMAIL IN MODALITÀ TEST
    </span>
  );
}

export function useCommunicationTestMode(): boolean {
  const settingsQ = useSharedAppSettingsQuery();
  return parseCommunicationSettings(
    settingsQ?.data?.rows?.find((r) => r.module === "communications" && r.key === "prefs")?.value,
  ).testMode;
}
