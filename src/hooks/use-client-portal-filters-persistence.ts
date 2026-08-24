"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CLIENT_PORTAL_FILTERS_EMPTY,
  loadClientPortalFiltersPersisted,
  saveClientPortalFiltersPersisted,
  type ClientPortalListFilters,
} from "@/lib/lavorazioni/client-portal-list-filters";

function readFiltersSync(): ClientPortalListFilters {
  if (typeof window === "undefined") return CLIENT_PORTAL_FILTERS_EMPTY;
  return loadClientPortalFiltersPersisted() ?? CLIENT_PORTAL_FILTERS_EMPTY;
}

export function useClientPortalFiltersPersistence() {
  const [filters, setFilters] = useState<ClientPortalListFilters>(CLIENT_PORTAL_FILTERS_EMPTY);
  const [searchInput, setSearchInput] = useState("");
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [restoring, setRestoring] = useState(true);

  // ponytail: hydration client-only — useState lazy init causerebbe mismatch SSR
  // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted filters after mount
  useEffect(() => {
    const initial = readFiltersSync();
    setFilters(initial);
    setSearchInput(typeof initial.search === "string" ? initial.search : "");
    setFiltersHydrated(true);
    setRestoring(false);
  }, []);

  const patchFilters = useCallback((patch: Partial<ClientPortalListFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if ("search" in patch) {
        next.search = typeof patch.search === "string" ? patch.search : "";
      }
      saveClientPortalFiltersPersisted(next);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setFilters(CLIENT_PORTAL_FILTERS_EMPTY);
    saveClientPortalFiltersPersisted(CLIENT_PORTAL_FILTERS_EMPTY);
  }, []);

  return {
    filters,
    searchInput,
    setSearchInput,
    patchFilters,
    resetFilters,
    filtersHydrated,
    restoring,
  };
}
