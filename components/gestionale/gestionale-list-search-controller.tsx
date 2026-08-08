"use client";

import { useEffect, useRef, type ChangeEvent, type ReactNode } from "react";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import {
  GestionaleListSearchField,
  type GestionaleListSearchFieldProps,
} from "@/components/gestionale/gestionale-list-search-field";
import { probeIslandRender } from "@/lib/search/search-render-probe";
import {
  GESTIONALE_SEARCH_DEBOUNCE_MS,
  useGestionaleListSearch,
  type UseGestionaleListSearchOptions,
} from "@/lib/search/use-gestionale-list-search";
import { GESTIONALE_SEARCH_PLACEHOLDER } from "@/lib/ui/design-system";
import type { SearchDomainId } from "@/lib/search/types";

export type GestionaleListSearchControllerProps = {
  domain?: SearchDomainId;
  debounceMs?: number;
  initialSearch?: string;
  /** URL / external hydrate — applies immediately when value changes. */
  hydrateQuery?: string | null;
  /** Increment to clear search from parent without owning input state. */
  clearSignal?: number;
  onSearchAppliedChange: (query: string) => void;
  /** Optional: parent tracks typing indicator without owning input (e.g. badge). */
  onTypingChange?: (typing: boolean) => void;
  variant?: "plain" | "suggestions";
  id?: string;
  "aria-label"?: string;
  placeholder?: string;
  wrapperClassName?: string;
  className?: string;
  /** Suggestions variant only */
  suggestionPool?: readonly string[];
  suggestionLimit?: number;
  onSuggestionSelect?: (label: string) => void;
  onFocusChange?: (focused: boolean) => void;
  footer?: ReactNode;
  /** Suggestions variant: map visible label → applied search query. */
  mapSuggestionToQuery?: (label: string) => string;
  /** Plain/suggestions: map input on Enter before flush. */
  mapInputToQueryOnEnter?: (input: string) => string;
  /** Debounced live input — for parent suggestion pools without per-keystroke parent render. */
  onDebouncedInputChange?: (value: string) => void;
  listSearchFieldProps?: Omit<
    GestionaleListSearchFieldProps,
    "value" | "onChange" | "onKeyDown" | "suggestionPool" | "suggestionLimit" | "onSuggestionSelect" | "onFocusChange"
  >;
};

/**
 * Search island — owns searchInput + debounce; parent receives only searchApplied.
 */
export function GestionaleListSearchController({
  domain,
  debounceMs,
  initialSearch,
  hydrateQuery,
  clearSignal = 0,
  onSearchAppliedChange,
  onTypingChange,
  variant = "plain",
  id,
  "aria-label": ariaLabel,
  placeholder = GESTIONALE_SEARCH_PLACEHOLDER,
  wrapperClassName,
  className,
  suggestionPool = [],
  suggestionLimit = 8,
  onSuggestionSelect,
  onFocusChange,
  footer,
  mapSuggestionToQuery,
  mapInputToQueryOnEnter,
  onDebouncedInputChange,
  listSearchFieldProps,
}: GestionaleListSearchControllerProps) {
  const hookOpts: UseGestionaleListSearchOptions = {
    domain,
    debounceMs,
    initialSearch,
  };

  const {
    searchInput,
    setSearchInput,
    searchApplied,
    flushSearch,
    clearSearch,
    applySearchImmediate,
  } = useGestionaleListSearch(hookOpts);

  const lastAppliedRef = useRef(searchApplied);
  const lastClearSignalRef = useRef(clearSignal);
  const lastHydrateRef = useRef(hydrateQuery);

  probeIslandRender();

  useEffect(() => {
    if (lastAppliedRef.current !== searchApplied) {
      lastAppliedRef.current = searchApplied;
      onSearchAppliedChange(searchApplied);
    }
  }, [searchApplied, onSearchAppliedChange]);

  useEffect(() => {
    onTypingChange?.(searchInput.trim() !== searchApplied.trim());
  }, [searchInput, searchApplied, onTypingChange]);

  useEffect(() => {
    if (!onDebouncedInputChange) return;
    const ms = debounceMs ?? GESTIONALE_SEARCH_DEBOUNCE_MS;
    const t = window.setTimeout(() => onDebouncedInputChange(searchInput.trim()), ms);
    return () => window.clearTimeout(t);
  }, [searchInput, debounceMs, onDebouncedInputChange]);

  useEffect(() => {
    if (clearSignal === lastClearSignalRef.current) return;
    lastClearSignalRef.current = clearSignal;
    clearSearch();
  }, [clearSignal, clearSearch]);

  useEffect(() => {
    const q = hydrateQuery?.trim() ?? "";
    if (!q || q === lastHydrateRef.current) return;
    lastHydrateRef.current = hydrateQuery;
    applySearchImmediate(q);
  }, [hydrateQuery, applySearchImmediate]);

  const onEnter = () => {
    if (mapInputToQueryOnEnter) {
      const mapped = mapInputToQueryOnEnter(searchInput);
      applySearchImmediate(mapped);
      setSearchInput(searchInput.trim());
      return;
    }
    flushSearch();
  };

  const handleSuggestionSelect = (label: string) => {
    if (mapSuggestionToQuery) {
      const query = mapSuggestionToQuery(label);
      applySearchImmediate(query);
      setSearchInput(label);
      return;
    }
    onSuggestionSelect?.(label);
  };

  const field =
    variant === "suggestions" ? (
      <GestionaleListSearchField
        {...listSearchFieldProps}
        id={id}
        className={className}
        wrapperClassName={wrapperClassName}
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={searchInput}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
        suggestionPool={suggestionPool}
        suggestionLimit={suggestionLimit}
        onSuggestionSelect={mapSuggestionToQuery || onSuggestionSelect ? handleSuggestionSelect : undefined}
        onFocusChange={onFocusChange}
      />
    ) : (
      <GestionaleSearchField
        id={id}
        className={className}
        wrapperClassName={wrapperClassName}
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    );

  if (!footer) return field;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {field}
      {footer}
    </div>
  );
}

export { GESTIONALE_SEARCH_DEBOUNCE_MS };
