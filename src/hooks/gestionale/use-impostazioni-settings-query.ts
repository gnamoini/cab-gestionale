"use client";

import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

/** Impostazioni page: tier static + hydration dedup su `settings.payload` (SERVER_OWNER /impostazioni). */
export function useImpostazioniSettingsQuery(enabled = true) {
  return useCabAppSettingsPayloadQuery({ tier: "static", enabled });
}
