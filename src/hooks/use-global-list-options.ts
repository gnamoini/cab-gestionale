"use client";

import { useMemo } from "react";
import {
  attrezzatureCatalogToHierarchyTree,
  fetchAttrezzatureCatalogEntries,
  resolveMezziListeWithFleetCatalog,
} from "@/lib/attrezzature/attrezzature-catalog";
import type { AttrezzaturaMarca } from "@/lib/mezzi/attrezzature-prefs";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import {
  isStructuredListKey,
  resolveGlobalListItems,
  resolveGlobalListOptions,
  type GlobalListSelectItem,
  type GlobalSettingsListContext,
  type GlobalSettingsListKey,
} from "@/src/lib/global-list/global-settings-list-keys";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { success } from "@/src/services/service-result";

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
 * Aggiornamento cache via unified dispatch + Realtime (nessun listener legacy).
 */
export function useGlobalListOptions(
  listKey: GlobalSettingsListKey,
  context?: GlobalSettingsListContext,
  options?: { enabled?: boolean },
): GlobalListOptionsResult {
  const enabled = options?.enabled ?? true;
  const q = useCabAppSettingsPayloadQuery({ enabled, tier: "static" });
  const fleetQ = useServiceQuery<AttrezzaturaMarca[], readonly ["attrezzature-fleet-catalog"]>(
    ["attrezzature-fleet-catalog"],
    async () => {
      const sb = getBrowserSupabase();
      return success(
        attrezzatureCatalogToHierarchyTree(await fetchAttrezzatureCatalogEntries(sb)),
      );
    },
    { enabled, staleTime: 60_000 },
  );

  return useMemo((): GlobalListOptionsResult => {
    const structured = isStructuredListKey(listKey);
    const fleetTree = fleetQ.data;
    const mergeFleetAttrezzature =
      context?.hierarchyTree === "attrezzature" && fleetTree && fleetTree.length > 0;
    const resolvedWithFleet =
      mergeFleetAttrezzature && q.data?.resolved
        ? {
            ...q.data.resolved,
            mezziListe: resolveMezziListeWithFleetCatalog(
              migrateMezziListePrefs(q.data.resolved.mezziListe),
              fleetTree,
            ),
          }
        : q.data?.resolved;
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
    if (q.isError || !resolvedWithFleet) {
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
    const resolved = resolvedWithFleet;
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
  }, [enabled, listKey, context, q.isPending, q.isError, q.error, q.data, fleetQ.data]);
}
