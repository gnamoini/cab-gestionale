"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseSearchQuery } from "@/lib/search/parse-query";
import type { ParsedSearchQuery, SearchDomainId } from "@/lib/search/types";
import { resolveExecutionMode } from "@/lib/search/registry";

export const GESTIONALE_SEARCH_DEBOUNCE_MS = 250;

export type UseGestionaleListSearchOptions = {
  domain?: SearchDomainId;
  debounceMs?: number;
  initialSearch?: string;
};

export type UseGestionaleListSearchResult = {
  searchInput: string;
  setSearchInput: (value: string) => void;
  searchApplied: string;
  parsedQuery: ParsedSearchQuery;
  flushSearch: (forcedValue?: string) => void;
  clearSearch: () => void;
  applySearchImmediate: (value: string) => void;
  executionMode: ReturnType<typeof resolveExecutionMode>;
  serverSearchEnabled: boolean;
};

export function useGestionaleListSearch(
  options: UseGestionaleListSearchOptions = {},
): UseGestionaleListSearchResult {
  const { domain, debounceMs = GESTIONALE_SEARCH_DEBOUNCE_MS, initialSearch = "" } = options;
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchApplied, setSearchApplied] = useState(initialSearch.trim());
  const flushPendingRef = useRef(false);
  const searchInputRef = useRef(searchInput);
  searchInputRef.current = searchInput;

  const setSearchInputLive = useCallback((value: string) => {
    searchInputRef.current = value;
    setSearchInput(value);
  }, []);

  const flushSearch = useCallback((forcedValue?: string) => {
    flushPendingRef.current = true;
    setSearchApplied((forcedValue ?? searchInputRef.current).trim());
  }, []);

  useEffect(() => {
    if (flushPendingRef.current) {
      flushPendingRef.current = false;
      return;
    }
    const t = window.setTimeout(() => setSearchApplied(searchInput.trim()), debounceMs);
    return () => window.clearTimeout(t);
  }, [searchInput, debounceMs]);

  const applySearchImmediate = useCallback((value: string) => {
    flushPendingRef.current = true;
    setSearchInput(value);
    setSearchApplied(value.trim());
  }, []);

  const clearSearch = useCallback(() => {
    flushPendingRef.current = true;
    setSearchInput("");
    setSearchApplied("");
  }, []);

  const executionMode = domain ? resolveExecutionMode(domain) : "client";
  const serverSearchEnabled = executionMode === "server" || executionMode === "both";
  const parsedQuery = parseSearchQuery(searchApplied);

  return {
    searchInput,
    setSearchInput: setSearchInputLive,
    searchApplied,
    parsedQuery,
    flushSearch,
    clearSearch,
    applySearchImmediate,
    executionMode,
    serverSearchEnabled,
  };
}
