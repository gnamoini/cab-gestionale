"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { LoadingErrorState } from "@/components/design-system";
import { HighlightSearchMatch } from "@/components/gestionale/global-input/highlight-search-match";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { GlobalVirtualizedListbox } from "@/components/gestionale/global-input/global-virtualized-listbox";
import { formatMezzoSearchResultLines } from "@/lib/mezzi/format-mezzo-search-result";
import { readMezzoSelectionRecents } from "@/lib/mezzi/mezzo-selection-recents";
import {
  resolveSingleMezzoPickerEnter,
  searchMezziForPicker,
  type MezzoPickerListItem,
} from "@/lib/mezzi/search-mezzi-for-picker";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoSelectionSource, SelectedMezzoContext } from "@/lib/lavorazioni/selected-mezzo-context";
import { useSelectorListboxKeyboard } from "@/lib/selector-interaction/use-selector-listbox-keyboard";
import { dsBtnNeutral, dsBtnPrimary, GESTIONALE_SEARCH_PLACEHOLDER } from "@/lib/ui/design-system";
import { globalAutocompleteOptionClass } from "@/lib/ui/global-input";

const SEARCH_DEBOUNCE_MS = 180;

function mezzoSelectionSourceFromSection(sectionId: string | undefined): MezzoSelectionSource {
  if (sectionId === "recenti") return "recent";
  if (sectionId?.startsWith("cliente:")) return "cliente-group";
  return "search";
}

function ListSkeleton() {
  return (
    <div className="space-y-2 py-1" aria-busy="true" aria-label="Caricamento mezzi">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-[var(--ds-radius-lg)] bg-[color:color-mix(in_srgb,var(--cab-border)_35%,var(--cab-surface))]"
        />
      ))}
    </div>
  );
}

export function MezzoSelectionPanel({
  catalog,
  catalogLoading,
  catalogError,
  query,
  onQueryChange,
  onSelect,
  userId,
  listFooter,
}: {
  catalog: readonly MezzoGestito[];
  catalogLoading: boolean;
  catalogError?: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (ctx: SelectedMezzoContext) => void;
  userId?: string | null;
  /** Slot opzionale sotto la lista (es. shell con footer esterno). */
  listFooter?: React.ReactNode;
}) {
  const listboxId = useId();
  const listScrollRef = useRef<HTMLDivElement>(null);
  const scrollToRowRef = useRef<((index: number) => void) | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  const recentIds = useMemo(() => readMezzoSelectionRecents(userId), [userId, catalog.length]);

  const searchResult = useMemo(
    () =>
      searchMezziForPicker(catalog, debouncedQuery, {
        recentIds,
        userId,
      }),
    [catalog, debouncedQuery, recentIds, userId],
  );

  const navigableItems = useMemo(
    () => searchResult.items.filter((item): item is Extract<MezzoPickerListItem, { kind: "mezzo" }> => item.kind === "mezzo"),
    [searchResult.items],
  );

  const sectionByNavIndex = useMemo(() => {
    const map = new Map<number, string>();
    let lastSection = debouncedQuery.trim() ? "search" : "recenti";
    for (const item of searchResult.items) {
      if (item.kind === "section") lastSection = item.sectionId;
      else map.set(item.navigableIndex, lastSection);
    }
    return map;
  }, [searchResult.items, debouncedQuery]);

  const selectMezzo = useCallback(
    (mezzo: MezzoGestito, navigableIndex: number) => {
      const sectionId = sectionByNavIndex.get(navigableIndex);
      onSelect({
        mode: "existing",
        mezzoId: mezzo.id,
        source: mezzoSelectionSourceFromSection(sectionId),
      });
    },
    [onSelect, sectionByNavIndex],
  );

  const handleEnter = useCallback(() => {
    const single = resolveSingleMezzoPickerEnter(searchResult);
    if (single) {
      const idx = navigableItems.findIndex((item) => item.mezzo.id === single.id);
      selectMezzo(single, idx >= 0 ? idx : 0);
      return;
    }
    if (activeIndex >= 0 && activeIndex < navigableItems.length) {
      const row = navigableItems[activeIndex]!;
      selectMezzo(row.mezzo, row.navigableIndex);
    }
  }, [activeIndex, navigableItems, searchResult, selectMezzo]);

  const handleListKeyDown = useSelectorListboxKeyboard({
    open: true,
    totalNavigableOptions: navigableItems.length,
    activeIndex,
    setOpen: () => {},
    setActiveIndex,
    onEscape: () => {},
    onEnter: handleEnter,
  });

  const onSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      handleListKeyDown(e);
    },
    [handleListKeyDown],
  );

  useEffect(() => {
    if (activeIndex < 0) return;
    scrollToRowRef.current?.(activeIndex);
  }, [activeIndex]);

  const showDuplicateWarning =
    searchResult.hasSearchQuery && !catalogLoading && catalog.length > 0 && navigableItems.length === 0;

  const catalogInitialLoading = catalogLoading && catalog.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <GestionaleSearchField
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setActiveIndex(-1);
        }}
        onKeyDown={onSearchKeyDown}
        placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
        aria-label="Cerca mezzo"
        aria-controls={listboxId}
        autoComplete="off"
        autoFocus
        disabled={catalogInitialLoading}
      />

      {catalogError ? (
        <LoadingErrorState title="Errore caricamento mezzi" description={catalogError} />
      ) : catalogInitialLoading ? (
        <ListSkeleton />
      ) : catalog.length === 0 && !catalogLoading ? (
        <p className="px-1 py-3 text-sm text-[color:var(--cab-text-muted)]">
          Nessun mezzo in anagrafica. Usa &quot;Nuovo mezzo&quot; per registrare il primo.
        </p>
      ) : (
        <div
          ref={listScrollRef}
          className="gestionale-scrollbar min-h-0 flex-1 overflow-y-auto"
          onKeyDown={handleListKeyDown}
        >
          {showDuplicateWarning ? (
            <div
              role="status"
              className="mb-2 rounded-[var(--ds-radius-lg)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
            >
              Nessun risultato trovato. Verifica di non creare un duplicato prima di procedere.
            </div>
          ) : null}

          {navigableItems.length === 0 && !searchResult.hasSearchQuery ? (
            <p className="px-1 py-3 text-xs text-[color:var(--cab-text-muted)]">
              Digita targa, matricola, cliente o marca per filtrare l&apos;anagrafica.
            </p>
          ) : null}

          {navigableItems.length === 0 && searchResult.hasSearchQuery && !showDuplicateWarning ? null : (
            <GlobalVirtualizedListbox
              rowCount={searchResult.items.length}
              scrollRef={listScrollRef}
              scrollToRowRef={scrollToRowRef}
              externalScrollHost
              estimateRowHeight={52}
              id={listboxId}
              role="listbox"
              aria-label="Risultati ricerca mezzi"
              className="space-y-1"
              renderRow={(index) => {
                const item = searchResult.items[index];
                if (!item) return null;
                if (item.kind === "section") {
                  return (
                    <div
                      className="sticky top-0 z-[1] bg-[var(--cab-card)] px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]"
                      role="presentation"
                    >
                      {item.label}
                      {item.count != null ? ` (${item.count})` : ""}
                    </div>
                  );
                }
                const lines = formatMezzoSearchResultLines(item.mezzo);
                const isActive = item.navigableIndex === activeIndex;
                const highlightQ = debouncedQuery.trim();
                return (
                  <div role="presentation" data-listbox-row-index={item.navigableIndex}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`${globalAutocompleteOptionClass(isActive, false)} !min-h-11 !w-full !text-left`}
                      onClick={() => selectMezzo(item.mezzo, item.navigableIndex)}
                      onMouseEnter={() => setActiveIndex(item.navigableIndex)}
                    >
                      <span className="block truncate font-medium text-[color:var(--cab-fg)]">
                        <HighlightSearchMatch text={lines.primary} query={highlightQ} />
                      </span>
                      {lines.secondary ? (
                        <span className="mt-0.5 block truncate text-xs font-normal text-[color:var(--cab-text-muted)]">
                          <HighlightSearchMatch text={lines.secondary} query={highlightQ} />
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              }}
            />
          )}
        </div>
      )}

      {listFooter}
    </div>
  );
}

export function MezzoSelectionPanelFooter({
  onNuovoMezzo,
  showDuplicateWarning,
}: {
  onNuovoMezzo: () => void;
  showDuplicateWarning?: boolean;
}) {
  return (
    <div className="shrink-0 space-y-2 border-t border-[color:var(--cab-border)] pt-3">
      {showDuplicateWarning ? (
        <p className="text-xs text-[color:var(--cab-text-muted)]">
          Se il mezzo esiste già, torna indietro e affina la ricerca.
        </p>
      ) : null}
      <button type="button" className={`${dsBtnNeutral} min-h-11 w-full`} onClick={onNuovoMezzo}>
        Nuovo mezzo
      </button>
    </div>
  );
}

export function MezzoSelectionPanelPrimaryFooter({
  onNuovoMezzo,
}: {
  onNuovoMezzo: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-[color:var(--cab-border)] pt-3">
      <button type="button" className={`${dsBtnPrimary} min-h-11 w-full`} onClick={onNuovoMezzo}>
        Nuovo mezzo
      </button>
    </div>
  );
}
