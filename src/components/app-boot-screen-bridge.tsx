"use client";

import { AppBootScreen } from "@/components/design-system/loading/app-boot-screen";

/** Cold start boot screen — montato in AppProvidersCore dentro AuthProvider. */
export function AppBootScreenBridge() {
  return <AppBootScreen />;
}
