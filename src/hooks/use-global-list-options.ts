"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  isStructuredListKey,
  resolveGlobalListItems,
  resolveGlobalListOptions,
  type GlobalListSelectItem,
  type GlobalSettingsListContext,
  type GlobalSettingsListKey,
} from "@/src/lib/global-list/global-settings-list-keys";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { QK } from "@/src/lib/react-query/invalidate-related";

export type GlobalListOptionsResult = {
  mode: "strings" | "items";
  options: string[];
  items: GlobalListSelectItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  source: "app_settings" | "unavailable";
  ready: boolean;
};

/**
 * Elenchi da `app_settings` per combobox globali — nessun array passato dal parent.
 */
export function useGlobalListOptions(
  listKey: GlobalSettingsListKey,
  context?: GlobalSettingsListContext,
  options?: { enabled?: boolean },
): GlobalListOptionsResult {
  const enabled = options?.enabled ?? true;
  const qc = useQueryClient();
  const q = useCabAppSettingsPayloadQuery({ enabled, staleTime: 0 });

  useCabSyncListener("settings", () => {
    void qc.invalidateQueries({ queryKey: [...QK.settings] });
  });

  return useMemo((): GlobalListOptionsResult => {
    const structured = isStructuredListKey(listKey);
    if (!enabled || q.isPending) {
      return {
        mode: structured ? "items" : "strings",
        options: [],
        items: [],
        isLoading: true,
        isError: false,
        error: null,
        source: "unavailable",
        ready: false,
      };
    }
    if (q.isError || !q.data?.resolved) {
      return {
        mode: structured ? "items" : "strings",
        options: [],
        items: [],
        isLoading: false,
        isError: true,
        error: q.error ?? new Error("Impostazioni non disponibili"),
        source: "unavailable",
        ready: false,
      };
    }
    const resolved = q.data.resolved;
    if (structured) {
      const items = resolveGlobalListItems(resolved, listKey);
      return {
        mode: "items",
        options: [],
        items,
        isLoading: false,
        isError: false,
        error: null,
        source: "app_settings",
        ready: true,
      };
    }
    const opts = resolveGlobalListOptions(resolved, listKey, context);
    return {
      mode: "strings",
      options: opts,
      items: [],
      isLoading: false,
      isError: false,
      error: null,
      source: "app_settings",
      ready: true,
    };
  }, [enabled, listKey, context, q.isPending, q.isError, q.error, q.data]);
}
