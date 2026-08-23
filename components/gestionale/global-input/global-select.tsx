"use client";

import { Tooltip } from "@/components/ui";
import dynamic from "next/dynamic";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, startTransition } from "react";
import { createPortal } from "react-dom";
import {
  autocompleteCommitFromSearchText,
  autocompleteCommittedDisplayValue,
  autocompleteDisplayValue,
  autocompleteFuzzySuggestion,
  autocompleteIsValid,
  autocompleteShowAddOption,
  autocompleteAddOptionEnabled,
  type AutocompleteDataMode,
} from "@/lib/global-autocomplete/engine";
import {
  globalAutocompleteAddBtnClass,
  globalAutocompleteDropdownPortalPanel,
  globalInputEmptyMessage,
  globalInputComboboxClearBtn,
  globalInputFieldDefault,
  globalInputFieldFilterSearch,
  globalInputFieldFilterSelect,
  globalInputInvalidRing,
} from "@/lib/ui/global-input";
import { scheduleFocusNextGestionaleField } from "@/lib/ui/gestionale-focus-navigation";
import {
  registerGestionaleComboboxFlush,
  unregisterGestionaleComboboxFlush,
} from "@/lib/ui/gestionale-form-submit-flush";
import { useClientHydrated } from "@/lib/ui/use-client-hydrated";
import type { ListSelectItem } from "@/lib/ui/list-select-items";
import { countUniqueListOptions, normListSelectValue } from "@/lib/ui/list-select-utils";
import {
  pushSelectorRecent,
  readSelectorRecents,
} from "@/lib/selector-core/selector-recents-store";
import { resolveSelectorSuggestions } from "@/lib/selector-core/resolve-selector-suggestions";
import { buildSelectorContext } from "@/lib/selector-core/build-selector-context";
import {
  SelectorDecisionEngine,
  SHEET_MIN_OPTIONS,
  isSelectorDomainSheetRolloutEnabled,
} from "@/lib/selector-core/selector-decision-engine";
import { emitSelectorOpenFromUI } from "@/lib/selector-core/selector-telemetry-bridge";
import type { SelectorDomain } from "@/lib/selector-core/types";
import {
  runSelectOptionAtomic,
  shouldIgnoreBlurDuringSelection,
} from "@/lib/selector-core/select-option-atomic";
import { useSelectorListboxKeyboard } from "@/lib/selector-interaction/use-selector-listbox-keyboard";
import { useSelectorOverlayBack } from "@/lib/selector-interaction/use-selector-overlay-back";
import { useSelectorQueryBridge } from "@/lib/selector-interaction/use-selector-query-bridge";
import { useSelectorFocusChain } from "@/lib/selector-interaction/use-selector-focus-chain";
import { useSelectorScrollRestoration } from "@/lib/selector-interaction/use-selector-scroll-restoration";
import { useSelectorExclusiveGroup } from "@/lib/selector-interaction/use-selector-exclusive-group";
import { armSelectorGhostClickGuard } from "@/lib/selector-interaction/suppress-selector-ghost-click";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import { findSimilarEntityInPool } from "@/lib/validation/global-entity-validation";
import { EntitySimilarWarning } from "@/components/design-system/entity-similar-warning";
import { SelectorEmptyState } from "@/components/gestionale/global-input/selector-empty-state";
import {
  EMPTY_SUGGESTIONS,
  fieldClassForVariant,
  isFilterNeutralValue,
  type GlobalSelectAddAction,
  type GlobalSelectOption,
  type GlobalSelectProps,
} from "@/components/gestionale/global-input/global-select-types";
import { globalSelectDropdownPanelClass } from "@/components/gestionale/global-input/global-select-listbox-panel";
import { SelectorListbox } from "@/components/gestionale/selector/selector-listbox";
import {
  defaultItemRenderOption,
  defaultStringRenderOption,
} from "@/components/gestionale/selector/selector-listbox-helpers";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import type { CSSProperties } from "react";

export type {
  GlobalSelectAddAction,
  GlobalSelectItemsProps,
  GlobalSelectOption,
  GlobalSelectProps,
  GlobalSelectStringProps,
} from "@/components/gestionale/global-input/global-select-types";

const GestionaleSearchableSheetSelect = dynamic(
  () =>
    import("@/components/gestionale/global-input/gestionale-searchable-sheet-select").then((m) => ({
      default: m.GestionaleSearchableSheetSelect,
    })),
);

/** @deprecated Usare `GlobalSelect` — alias storico. */
export const GlobalAutocompleteCombobox = GlobalSelect;

export function GlobalSelect(props: GlobalSelectProps) {
  const {
    value,
    onChange,
    disabled,
    required,
    placeholder,
    className = "",
    variant = "default",
    inputClassName,
    id: idProp,
    strictFromList = true,
    invalidMessage = "Seleziona un valore esistente",
    forceInvalid = false,
    onValidityChange,
    isLoading = false,
    emptyMessage = globalInputEmptyMessage,
    allowAdd = false,
    canAdd = true,
    addPending = false,
    onAddToList,
    addActions,
    coloredOptions = false,
    filterNeutralValues,
    showSimilarWarning = true,
    similarStandardizeLegalSuffix = false,
    selectOnly = false,
    mobileSheet,
    mobileSheetMode,
    rolloutKey,
    selectorDomain,
    dynamicList,
    operationalFilter,
    sheetTitle,
    recentsKey,
    alphabeticalBrowse = false,
    preserveItemOrder = false,
    highlightSearch = true,
    minSheetOptions,
    exclusiveGroup,
    clearable = false,
    hideEmptyOptionInInput = false,
    "aria-label": ariaLabel,
  } = props;

  const isFilterVariant = variant === "filter";
  const itemsMode = "items" in props && props.items != null;
  const mode: AutocompleteDataMode = itemsMode ? "items" : "strings";
  const items = itemsMode ? props.items : [];
  const options = !itemsMode ? props.options : [];

  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const hydrated = useClientHydrated();
  const isMobile = useMaxMdDown();
  const showLoadingUi = hydrated && isLoading;

  const wrapRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const sheetListScrollRef = useRef<HTMLDivElement>(null);
  const scrollToRowRef = useRef<((index: number) => void) | null>(null);
  const keyboardScrollPendingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editSessionRef = useRef({ modified: false });
  const addInFlightRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [sheetListReady, setSheetListReady] = useState(false);
  const openSheetIntentRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const queryBridge = useSelectorQueryBridge({ clearQueryOnClose: true });
  const { query, setQuery, deriveSurface, resetQuery, onFocusIn, sheetSearchRef } = queryBridge;
  const deferredQuery = useDeferredValue(query);
  const [focused, setFocused] = useState(false);
  const [recentValues, setRecentValues] = useState<string[]>([]);
  const { restoreFocus, captureFocus } = useDropdownFocusRestore(open);

  const totalOptionCount = useMemo(() => {
    if (itemsMode) return items.length;
    return countUniqueListOptions(options);
  }, [itemsMode, items, options]);

  const decisionTraceIdRef = useRef("");

  const resolvedMobileSheetMode = useMemo((): "selectOnly" | "searchable" | "off" => {
    if (mobileSheetMode) return mobileSheetMode;
    if (selectOnly) return "selectOnly";
    if (selectorDomain && isSelectorDomainSheetRolloutEnabled(selectorDomain)) return "searchable";
    return "selectOnly";
  }, [mobileSheetMode, selectOnly, selectorDomain]);

  const resolvedMinSheetOptions = useMemo(() => {
    if (minSheetOptions != null) return minSheetOptions;
    if (selectorDomain && isSelectorDomainSheetRolloutEnabled(selectorDomain)) {
      return 0;
    }
    return SHEET_MIN_OPTIONS;
  }, [minSheetOptions, selectorDomain]);

  const selectorDecision = useMemo(() => {
    const decision = SelectorDecisionEngine.resolve(
      buildSelectorContext({
        selectorDomain,
        rolloutKey,
        selectOnly,
        mobileSheetMode: resolvedMobileSheetMode,
        mobileSheet,
        sheetSearchableEnabled: resolvedMobileSheetMode === "searchable",
        dynamicList,
        operationalFilter: operationalFilter ?? variant === "filter",
        isMobile,
        optionCount: totalOptionCount,
        minSheetOptions:
          minSheetOptions ??
          (variant === "filter" ? 0 : resolvedMinSheetOptions),
      }),
    );
    decisionTraceIdRef.current = decision.traceId ?? "";
    return decision;
  }, [
    selectorDomain,
    rolloutKey,
    selectOnly,
    resolvedMobileSheetMode,
    mobileSheet,
    dynamicList,
    operationalFilter,
    variant,
    isMobile,
    totalOptionCount,
    minSheetOptions,
    resolvedMinSheetOptions,
  ]);

  const effectiveSelectOnly = selectorDecision.flags.isSelectOnly;
  const useSheet = hydrated && selectorDecision.flags.usesSheet;
  const sheetUsesSearch = useSheet && selectorDecision.flags.usesSearch;
  const sheetListOnly = useSheet && !selectorDecision.flags.usesSearch;
  const browseAsSelectOnly = effectiveSelectOnly || sheetListOnly;
  /** Mobile sheet: tap-to-open, ricerca nella sheet — evita blur/commit sul trigger. */
  const useSheetTriggerMode = useSheet;

  const fieldClass = useMemo(() => {
    const base = fieldClassForVariant(variant, inputClassName, effectiveSelectOnly || useSheetTriggerMode);
    if (!effectiveSelectOnly && !useSheetTriggerMode) return base;
    const normalized = base
      .replace(/\bcursor-text\b/g, "")
      .replace(/\bappearance-auto\b/g, "appearance-none")
      .trim();
    return `${normalized} gestionale-combobox-trigger cursor-pointer caret-transparent overflow-hidden text-ellipsis whitespace-nowrap`;
  }, [variant, inputClassName, effectiveSelectOnly, useSheetTriggerMode]);

  useEffect(() => {
    if (!open) return;
    const traceId = decisionTraceIdRef.current;
    if (!traceId) return;
    emitSelectorOpenFromUI(traceId, {
      isMobile,
      optionCount: totalOptionCount,
      domain: selectorDomain ?? rolloutKey ?? "unknown",
      rolloutKey,
    });
  }, [open, isMobile, totalOptionCount, selectorDomain, rolloutKey]);

  const resolvedSheetTitle = sheetTitle ?? ariaLabel ?? placeholder ?? "Seleziona";

  useEffect(() => {
    if (!recentsKey || !hydrated) return;
    setRecentValues(readSelectorRecents(recentsKey));
  }, [recentsKey, hydrated, open]);

  const engineInput = useMemo(
    () => ({
      mode,
      value,
      searchText: query,
      focused,
      open,
      options,
      items,
      hideEmptyOptionInInput,
    }),
    [mode, value, query, focused, open, options, items, hideEmptyOptionInInput],
  );

  const displayValue = useMemo(() => autocompleteDisplayValue(engineInput), [engineInput]);

  const isDeferPending = query !== deferredQuery;
  const suggestionSearchText =
    isDeferPending && !editSessionRef.current.modified ? query : deferredQuery;

  const sheetQuery = useSheet ? query : "";

  const highlightQuery = useSheet
    ? sheetUsesSearch
      ? sheetQuery
      : ""
    : effectiveSelectOnly
      ? ""
      : suggestionSearchText;

  const showDropdown = open && !disabled && !showLoadingUi;
  const sheetOpen = showDropdown && useSheet;
  const sheetActive = open && useSheet;

  useEffect(() => {
    if (!sheetOpen) {
      setSheetListReady(false);
      return;
    }
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) setSheetListReady(true);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [sheetOpen]);

  const deferSheetSuggestions = sheetOpen && !sheetListReady;

  const suggestions = useMemo(() => {
    if (!open || deferSheetSuggestions) return EMPTY_SUGGESTIONS;
    const sheetBrowseAll = sheetActive && !sheetQuery.trim();
    const resolveInput = {
      mode,
      selectOnly: browseAsSelectOnly || sheetBrowseAll,
      useSheet: sheetActive,
      sheetQuery: sheetActive ? sheetQuery : "",
      engineInput,
      suggestionSearchText,
      options,
      items,
      selectedValue: value,
      recentValues,
      recentsKey,
      alphabeticalBrowse,
      preserveItemOrder,
      browseCap: sheetBrowseAll ? totalOptionCount || undefined : undefined,
    };
    const resolved = resolveSelectorSuggestions(resolveInput);
    if (
      sheetActive &&
      sheetUsesSearch &&
      !sheetQuery.trim() &&
      resolved.length === 0 &&
      totalOptionCount > 0
    ) {
      return resolveSelectorSuggestions({
        ...resolveInput,
        selectOnly: true,
        useSheet: true,
        sheetQuery: "",
      });
    }
    return resolved;
  }, [
    mode,
    browseAsSelectOnly,
    sheetActive,
    sheetUsesSearch,
    sheetQuery,
    engineInput,
    suggestionSearchText,
    options,
    items,
    value,
    recentValues,
    recentsKey,
    alphabeticalBrowse,
    preserveItemOrder,
    totalOptionCount,
    open,
    deferSheetSuggestions,
  ]);

  const isListTruncated = totalOptionCount > suggestions.length;

  const addCandidate = focused ? query.trim() : useSheet ? sheetQuery.trim() : "";

  const fuzzySuggestion = useMemo(
    () => autocompleteFuzzySuggestion(addCandidate, mode, options, items),
    [addCandidate, mode, options, items],
  );

  const addActionsList = addActions?.length ? addActions : [];
  const hasMultiAdd = addActionsList.length > 0;
  const hasSingleAdd = Boolean(onAddToList) && !hasMultiAdd;

  const showAddOption = autocompleteShowAddOption({
    allowAdd,
    canAdd,
    hasOnAdd: hasMultiAdd || hasSingleAdd,
    open,
    disabled: Boolean(disabled),
    isLoading,
  });
  /** selectOnly / sheet elenco: niente superficie di scrittura — non mostrare «Aggiungi». */
  const canWriteForAdd = !browseAsSelectOnly || sheetUsesSearch;
  /** Sheet searchable: browse prima — «Aggiungi» solo dopo ricerca digitata. */
  const showAddOptionInUi =
    showAddOption &&
    canWriteForAdd &&
    !(sheetActive && sheetUsesSearch && !sheetQuery.trim());
  const addOptionEnabled = autocompleteAddOptionEnabled(addCandidate, addPending, {
    mode,
    options,
    items,
  });
  const addOptionCount =
    showAddOptionInUi && addOptionEnabled ? (hasMultiAdd ? addActionsList.length : hasSingleAdd ? 1 : 0) : 0;
  const addOptionIndex = hasSingleAdd && showAddOptionInUi ? suggestions.length : -1;
  const totalNavigableOptions = suggestions.length + addOptionCount;

  const isAddActiveIndex = useCallback(
    (idx: number) =>
      showAddOptionInUi &&
      addOptionEnabled &&
      idx >= suggestions.length &&
      idx < suggestions.length + addOptionCount,
    [showAddOptionInUi, addOptionEnabled, suggestions.length, addOptionCount],
  );

  const optionDomId = useCallback(
    (idx: number) => `${listboxId}-opt-${idx}`,
    [listboxId],
  );
  const addOptionDomId = `${listboxId}-add`;

  const activeDescendantId =
    activeIndex >= 0 && activeIndex < suggestions.length
      ? optionDomId(activeIndex)
      : isAddActiveIndex(activeIndex)
        ? hasMultiAdd
          ? `${listboxId}-add-${addActionsList[activeIndex - suggestions.length]!.id}`
          : addOptionDomId
        : undefined;

  const isValid = useMemo(() => {
    if (isFilterVariant && isFilterNeutralValue(value, filterNeutralValues)) return true;
    return autocompleteIsValid(value, Boolean(required), strictFromList, mode, options, items);
  }, [isFilterVariant, value, filterNeutralValues, required, strictFromList, mode, options, items]);

  const showInvalid = (touched || forceInvalid) && !isValid;
  const activeTextForSimilar = focused || query.length > 0 ? deferredQuery : value;
  const similarPool = useMemo(() => {
    if (itemsMode) return items.map((item) => item.label);
    return [...options];
  }, [itemsMode, items, options]);
  const canAddToList =
    allowAdd || Boolean(onAddToList) || (addActions != null && addActions.length > 0);
  const similarTo = useMemo(() => {
    if (isFilterVariant || !showSimilarWarning || !canAddToList || similarPool.length === 0) return null;
    const text = activeTextForSimilar.trim();
    if (!text) return null;
    return findSimilarEntityInPool(text, similarPool, {
      exclude: value.trim() || undefined,
      standardizeLegalSuffix: similarStandardizeLegalSuffix,
    });
  }, [
    isFilterVariant,
    showSimilarWarning,
    canAddToList,
    similarPool,
    activeTextForSimilar,
    value,
    similarStandardizeLegalSuffix,
  ]);

  const listEmpty =
    !showLoadingUi &&
    suggestions.length === 0 &&
    !showAddOptionInUi &&
    (addCandidate.length > 0 ||
      (useSheet && sheetQuery.trim().length > 0) ||
      (sheetActive && !sheetQuery.trim() && totalOptionCount === 0));
  const portalOpen = showDropdown && !useSheet && (totalNavigableOptions > 0 || listEmpty);

  const { style: portalStyle, placementOriginClass } = useGlobalDropdownPortal({
    open: portalOpen,
    anchorRef: wrapRef,
    contentRef: listScrollRef,
    repositionDeps: [suggestions.length, showAddOption, listEmpty, addOptionEnabled],
  });

  const closeAndResetRef = useRef<() => void>(() => {});

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const canClearCommittedFilter = useCallback(() => {
    if (!value.trim()) return false;
    return !isFilterNeutralValue(value, filterNeutralValues);
  }, [value, filterNeutralValues]);

  const handleResetSearch = useCallback(() => {
    setQuery("");
    setActiveIndex(-1);
    requestAnimationFrame(() => {
      const ref = sheetOpen ? sheetSearchRef.current : inputRef.current;
      ref?.focus({ preventScroll: true });
    });
  }, [setQuery, sheetOpen, sheetSearchRef]);

  const emptyStateNode = useMemo(
    () => (
      <SelectorEmptyState
        message={
          emptyMessage === globalInputEmptyMessage ? "Nessun risultato trovato" : emptyMessage
        }
        domain={selectorDomain}
        onResetSearch={handleResetSearch}
        showClearFilters={isFilterVariant && Boolean(query.trim() || value.trim())}
        onClearFilters={
          isFilterVariant
            ? () => {
                handleResetSearch();
                if (canClearCommittedFilter()) onChange("");
              }
            : undefined
        }
      />
    ),
    [
      emptyMessage,
      selectorDomain,
      handleResetSearch,
      isFilterVariant,
      query,
      value,
      canClearCommittedFilter,
      onChange,
    ],
  );

  const commitPendingForSubmit = useCallback(() => {
    if (effectiveSelectOnly) return;
    if (shouldIgnoreBlurDuringSelection()) return;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    const rawSearch = inputRef.current?.value ?? query;
    const trimmed = rawSearch.trim();
    const committedValue = value.trim();
    if (trimmed === committedValue) {
      setOpen(false);
      setActiveIndex(-1);
      resetQuery();
      setFocused(false);
      return;
    }
    editSessionRef.current.modified = false;
    setOpen(false);
    setActiveIndex(-1);
    setTouched(true);
    setFocused(false);
    if (!trimmed) {
      if (!isFilterVariant) {
        if (value) onChange("");
      } else if (canClearCommittedFilter()) {
        onChange("");
      }
      resetQuery();
      return;
    }
    const committed = autocompleteCommitFromSearchText(rawSearch, mode, options, items, strictFromList);
    if (isFilterVariant) {
      if (committed && committed !== value) onChange(committed);
    } else if (committed && committed !== value) {
      onChange(committed);
    } else if (trimmed !== value) {
      onChange(trimmed);
    }
    resetQuery();
  }, [
    effectiveSelectOnly,
    query,
    resetQuery,
    value,
    isFilterVariant,
    canClearCommittedFilter,
    mode,
    options,
    items,
    strictFromList,
    onChange,
  ]);

  const commitBlur = useCallback(() => {
    if (effectiveSelectOnly) {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    const rawSearch = inputRef.current?.value ?? query;
    const trimmed = rawSearch.trim();
    const typedPending = Boolean(trimmed && trimmed !== value.trim());
    const userModified = editSessionRef.current.modified || typedPending;
    editSessionRef.current.modified = false;
    setOpen(false);
    setActiveIndex(-1);
    setTouched(true);
    setFocused(false);
    if (!trimmed) {
      if (userModified) {
        if (!isFilterVariant) {
          if (value) onChange("");
        } else if (canClearCommittedFilter()) {
          onChange("");
        }
      }
      resetQuery();
      return;
    }
    const committed = autocompleteCommitFromSearchText(rawSearch, mode, options, items, strictFromList);
    if (committed && committed !== value) {
      onChange(committed);
    } else if (trimmed !== value && !isFilterVariant) {
      onChange(trimmed);
    }
    resetQuery();
  }, [
    effectiveSelectOnly,
    query,
    resetQuery,
    value,
    isFilterVariant,
    canClearCommittedFilter,
    mode,
    options,
    items,
    strictFromList,
    onChange,
  ]);

  const dismissDropdown = useCallback(() => {
    if (effectiveSelectOnly) {
      setOpen(false);
      setActiveIndex(-1);
      resetQuery();
      restoreFocus();
      return;
    }
    const domPending = inputRef.current?.value.trim() ?? "";
    const hasPending =
      editSessionRef.current.modified || Boolean(query.trim()) || Boolean(domPending);
    if (hasPending) {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      commitBlur();
      return;
    }
    setOpen(false);
    setActiveIndex(-1);
    setFocused(false);
    editSessionRef.current.modified = false;
    resetQuery();
    restoreFocus();
  }, [effectiveSelectOnly, query, commitBlur, restoreFocus, resetQuery]);

  useDropdownOutsideDismiss(portalOpen, wrapRef, listScrollRef, dismissDropdown);

  const closeAndReset = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setOpen(false);
    setActiveIndex(-1);
    setFocused(false);
    editSessionRef.current.modified = false;
    resetQuery();
    restoreFocus();
  }, [restoreFocus, resetQuery]);

  /** Chiusura da sibling nello stesso exclusiveGroup — non rubare focus al campo cliccato. */
  const closeForExclusiveGroup = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setOpen(false);
    setActiveIndex(-1);
    setFocused(false);
    editSessionRef.current.modified = false;
    resetQuery();
  }, [resetQuery]);

  const showClearBtn =
    clearable && !required && !disabled && !showLoadingUi && Boolean(value.trim());

  const handleClear = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (blurTimer.current) clearTimeout(blurTimer.current);
      editSessionRef.current.modified = false;
      closeForExclusiveGroup();
      onChange("");
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    },
    [closeForExclusiveGroup, onChange],
  );

  closeAndResetRef.current = closeAndReset;

  const { notifyOpening: notifyExclusiveGroupOpening } = useSelectorExclusiveGroup(
    exclusiveGroup,
    closeForExclusiveGroup,
  );

  const setSelectorOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      if (typeof next === "function") {
        setOpen((prev) => {
          const resolved = next(prev);
          if (resolved && !prev) notifyExclusiveGroupOpening();
          return resolved;
        });
        return;
      }
      if (next) notifyExclusiveGroupOpening();
      setOpen(next);
    },
    [notifyExclusiveGroupOpening],
  );

  useSelectorOverlayBack({
    open: portalOpen,
    onClose: () => closeAndResetRef.current(),
    source: "GlobalSelect-dropdown",
    layer: "selector",
  });
  useSelectorOverlayBack({
    open: sheetOpen,
    onClose: () => closeAndResetRef.current(),
    source: "GlobalSelect-sheet",
    layer: "selector",
  });

  const recordRecent = useCallback(
    (selected: string) => {
      if (!recentsKey) return;
      pushSelectorRecent(recentsKey, selected);
      setRecentValues(readSelectorRecents(recentsKey));
    },
    [recentsKey],
  );

  const cancelPendingBlur = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  const flushCombobox = useCallback(() => {
    commitPendingForSubmit();
  }, [commitPendingForSubmit]);

  const runAtomicSelect = useCallback(
    (nextValue: string, advanceFocus = true) => {
      runSelectOptionAtomic({
        cancelPendingBlur,
        onChange: (next) => {
          editSessionRef.current.modified = false;
          onChange(next);
        },
        nextValue,
        recordRecent,
        flushCombobox,
        closeOverlaySync: closeAndReset,
        resetInteractionState: () => setActiveIndex(-1),
        restoreFocusOrAdvance: advanceFocus
          ? () => scheduleFocusNextGestionaleField(inputRef.current)
          : undefined,
      });
      setTouched(true);
    },
    [onChange, closeAndReset, recordRecent, cancelPendingBlur, flushCombobox],
  );

  const selectString = useCallback(
    (option: string, advanceFocus = true) => {
      runAtomicSelect(option, advanceFocus);
    },
    [runAtomicSelect],
  );

  const selectItem = useCallback(
    (item: ListSelectItem, advanceFocus = true) => {
      runAtomicSelect(item.value, advanceFocus);
    },
    [runAtomicSelect],
  );

  const runAddWithHandler = useCallback(
    async (handler: (value: string) => void | Promise<string | null | void> | string | null) => {
      if (!addCandidate || addPending || addInFlightRef.current) return;
      addInFlightRef.current = true;
      cancelPendingBlur();
      try {
        const result = await handler(addCandidate);
        if (typeof result === "string" || result === null) {
          closeAndReset();
          setTouched(true);
          return;
        }
        const canonical = addCandidate.trim();
        if (canonical && normListSelectValue(canonical) !== normListSelectValue(value)) {
          runAtomicSelect(canonical, true);
        } else {
          closeAndReset();
          setTouched(true);
        }
      } catch {
        /* handler gestisce toast/ritorno null */
      } finally {
        addInFlightRef.current = false;
      }
    },
    [addCandidate, addPending, cancelPendingBlur, runAtomicSelect, closeAndReset, value],
  );

  const runAdd = useCallback(async () => {
    if (!onAddToList) return;
    await runAddWithHandler(onAddToList);
  }, [onAddToList, runAddWithHandler]);

  const runAddAction = useCallback(
    async (actionIndex: number) => {
      const action = addActionsList[actionIndex];
      if (!action) return;
      await runAddWithHandler(action.onAdd);
    },
    [addActionsList, runAddWithHandler],
  );

  const handleListboxEnter = useCallback(() => {
    if (showAddOptionInUi && addOptionEnabled) {
      if (isAddActiveIndex(activeIndex)) {
        if (hasMultiAdd) void runAddAction(activeIndex - suggestions.length);
        else void runAdd();
        return;
      }
      if (suggestions.length === 0 && addCandidate && hasSingleAdd) {
        void runAdd();
        return;
      }
    }
    if (activeIndex < 0 && !editSessionRef.current.modified) {
      closeForExclusiveGroup();
      scheduleFocusNextGestionaleField(inputRef.current);
      return;
    }
    if (suggestions.length > 0) {
      const idx = activeIndex >= 0 && activeIndex < suggestions.length ? activeIndex : 0;
      if (itemsMode) selectItem(suggestions[idx] as ListSelectItem);
      else selectString(suggestions[idx] as string);
      return;
    }
    const committed = autocompleteCommitFromSearchText(query, mode, options, items, strictFromList);
    if (committed) {
      runAtomicSelect(committed, true);
    }
  }, [
    showAddOptionInUi,
    addOptionEnabled,
    activeIndex,
    isAddActiveIndex,
    hasMultiAdd,
    hasSingleAdd,
    suggestions,
    addCandidate,
    runAdd,
    runAddAction,
    itemsMode,
    selectItem,
    selectString,
    query,
    mode,
    options,
    items,
    strictFromList,
    runAtomicSelect,
    closeForExclusiveGroup,
  ]);

  const listboxKeyboard = useSelectorListboxKeyboard({
    open: open || sheetOpen,
    totalNavigableOptions,
    activeIndex,
    setOpen: setSelectorOpen,
    setActiveIndex,
    onEscape: closeAndReset,
    onEnter: handleListboxEnter,
  });

  const runListboxKeyboard = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Tab") {
        keyboardScrollPendingRef.current = true;
      }
      listboxKeyboard(e);
    },
    [listboxKeyboard],
  );

  const onSheetSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (deriveSurface() !== "sheet") return;
      runListboxKeyboard(e);
    },
    [deriveSurface, runListboxKeyboard],
  );

  const seedSearchFromCommitted = useCallback(() => {
    setQuery(autocompleteCommittedDisplayValue(engineInput));
  }, [engineInput, setQuery]);

  const beginEditing = useCallback(() => {
    editSessionRef.current.modified = false;
    setFocused(true);
    setSelectorOpen(true);
    if (isFilterVariant && isFilterNeutralValue(value, filterNeutralValues)) {
      setQuery("");
    } else if (!value.trim()) {
      // ponytail: voce vuota (es. «Nessuna marca») — input pulito al focus, niente testo da cancellare a mano
      setQuery("");
    } else {
      seedSearchFromCommitted();
    }
  }, [isFilterVariant, filterNeutralValues, seedSearchFromCommitted, value, setQuery, setSelectorOpen]);

  const captureTriggerFocus = useSelectorFocusChain({
    sheetOpen,
    sheetSearchRef,
    triggerRef: inputRef,
    onFocusIn,
  });

  const handleSheetTriggerMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  const openSheetFromTrigger = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (open) return;
    const now = performance.now();
    if (now - openSheetIntentRef.current < 80) return;
    openSheetIntentRef.current = now;
    captureFocus();
    captureTriggerFocus();
    startTransition(() => {
      setSelectorOpen(true);
      setActiveIndex(-1);
      resetQuery();
    });
  }, [open, captureFocus, captureTriggerFocus, resetQuery, setSelectorOpen]);

  /** Sheet mobile: il trigger apre solo — chiusura via backdrop/X (no toggle su secondo tap). */
  const handleSheetTriggerClick = openSheetFromTrigger;

  const handleSelectOnlyTriggerMouseDown = handleSheetTriggerMouseDown;
  const handleSelectOnlyTriggerClick = useCallback(() => {
    if (open) {
      dismissDropdown();
      return;
    }
    openSheetFromTrigger();
  }, [open, dismissDropdown, openSheetFromTrigger]);

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (useSheetTriggerMode && !open && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openSheetFromTrigger();
        return;
      }
      if (deriveSurface() !== "trigger") return;
      runListboxKeyboard(e);
    },
    [useSheetTriggerMode, open, openSheetFromTrigger, deriveSurface, runListboxKeyboard],
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const flush = () => {
      commitPendingForSubmit();
    };
    registerGestionaleComboboxFlush(input, flush);
    return () => unregisterGestionaleComboboxFlush(input);
  }, [commitPendingForSubmit]);

  useEffect(() => {
    if (activeIndex < 0 || (!portalOpen && !sheetOpen)) return;
    // Solo navigazione tastiera: l'hover mouse aggiorna activeIndex ma non deve scrollare la lista.
    if (!keyboardScrollPendingRef.current) return;
    keyboardScrollPendingRef.current = false;
    if (activeIndex < suggestions.length && scrollToRowRef.current) {
      scrollToRowRef.current(activeIndex);
      return;
    }
    const id =
      activeIndex < suggestions.length
        ? optionDomId(activeIndex)
        : isAddActiveIndex(activeIndex)
          ? hasMultiAdd
            ? `${listboxId}-add-${addActionsList[activeIndex - suggestions.length]!.id}`
            : addOptionDomId
          : null;
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: "nearest" });
  }, [
    activeIndex,
    portalOpen,
    sheetOpen,
    suggestions.length,
    isAddActiveIndex,
    hasMultiAdd,
    addActionsList,
    optionDomId,
    addOptionDomId,
    listboxId,
  ]);

  const scrollToSuggestionIndex = useCallback((index: number) => {
    scrollToRowRef.current?.(index);
  }, []);

  useSelectorScrollRestoration({
    open: portalOpen || sheetOpen,
    query: useSheet ? sheetQuery : suggestionSearchText,
    activeIndex,
    selectedValue: value,
    suggestions,
    getSuggestionKey: (item, i) =>
      itemsMode ? (item as ListSelectItem).value : (item as string),
    optionDomId,
    scrollToIndex: scrollToSuggestionIndex,
    onRestoreActiveIndex: setActiveIndex,
  });

  useEffect(() => {
    if (!open || useSheet) return;
    const onResize = () => {
      if (!open) return;
      closeAndResetRef.current();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, useSheet]);

  const fuzzyLabel =
    itemsMode && fuzzySuggestion && typeof fuzzySuggestion === "object"
      ? (fuzzySuggestion as ListSelectItem).label
      : typeof fuzzySuggestion === "string"
        ? fuzzySuggestion
        : null;

  const dropdownPanelClass = globalSelectDropdownPanelClass(placementOriginClass);

  const addOptionBtnClass = (active: boolean) =>
    `${globalAutocompleteAddBtnClass}${active ? " ring-2 ring-inset ring-white/25 shadow-sm" : ""}`;
  const singleAddOptionLabel = addPending
    ? "Aggiunta in corso…"
    : addOptionEnabled && addCandidate
      ? `Aggiungi «${addCandidate}»`
      : useSheet && sheetUsesSearch
        ? "Digita nella ricerca per aggiungere"
        : "Aggiungi all'elenco";

  const onPointerSelect = useCallback(
    (e: React.PointerEvent, select: () => void) => {
      e.preventDefault();
      e.stopPropagation();
      armSelectorGhostClickGuard();
      cancelPendingBlur();
      select();
    },
    [cancelPendingBlur],
  );

  const stringRenderOption = useMemo(
    () =>
      defaultStringRenderOption({
        highlightQuery,
        highlightSearch,
        onPointerSelect,
        sheetTapSelect: sheetOpen,
      }),
    [highlightQuery, highlightSearch, onPointerSelect, sheetOpen],
  );

  const itemRenderOption = useMemo(
    () =>
      defaultItemRenderOption({
        value,
        coloredOptions,
        highlightQuery,
        highlightSearch,
        onPointerSelect,
        sheetTapSelect: sheetOpen,
      }),
    [value, coloredOptions, highlightQuery, highlightSearch, onPointerSelect, sheetOpen],
  );

  const listFooterNote = isListTruncated ? (
    <p className="px-2 py-1.5 text-[10px] font-medium text-[color:var(--cab-text-muted)]" role="status">
      Mostrati {suggestions.length} di {totalOptionCount} — affina la ricerca per trovare altri risultati.
    </p>
  ) : null;

  const recentSection =
    recentsKey && recentValues.length > 0 && !highlightQuery.trim() && effectiveSelectOnly ? (
      <div className="border-b border-[color:var(--cab-border)] px-2 py-1.5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Recenti
        </p>
        <div className="flex min-w-0 flex-wrap gap-1">
          {recentValues.map((recent) => {
            const label = itemsMode
              ? items.find((i) => i.value === recent)?.label ?? recent
              : options.find((o) => normListSelectValue(o) === normListSelectValue(recent)) ?? recent;
            return (
              <button
                key={recent}
                type="button"
                className="rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2 py-1 text-xs font-medium text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  armSelectorGhostClickGuard();
                  if (itemsMode) {
                    const item = items.find((i) => i.value === recent);
                    if (item) selectItem(item);
                    else runAtomicSelect(recent);
                  } else {
                    selectString(recent);
                  }
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  const optionsListBody = (
    <>
      {recentSection}
      {suggestions.length > 0 ? (
        itemsMode ? (
          <SelectorListbox
            suggestions={suggestions as GlobalSelectOption[]}
            activeIndex={activeIndex}
            selectedValue={value}
            getOptionId={(_, idx) => optionDomId(idx)}
            getOptionKey={(item) => item.value}
            renderOption={itemRenderOption}
            onSelect={(item) => selectItem(item, false)}
            onActiveIndexChange={setActiveIndex}
            scrollRef={sheetOpen ? sheetListScrollRef : listScrollRef}
            scrollToRowRef={scrollToRowRef}
            externalScrollHost
            hoverActivatesIndex={!sheetOpen}
          />
        ) : (
          <SelectorListbox
            suggestions={suggestions as string[]}
            activeIndex={activeIndex}
            selectedValue={normListSelectValue(value)}
            getOptionId={(_, idx) => optionDomId(idx)}
            getOptionKey={(item) => normListSelectValue(item)}
            renderOption={stringRenderOption}
            onSelect={(option) => selectString(option, false)}
            onActiveIndexChange={setActiveIndex}
            scrollRef={sheetOpen ? sheetListScrollRef : listScrollRef}
            scrollToRowRef={scrollToRowRef}
            externalScrollHost
            hoverActivatesIndex={!sheetOpen}
          />
        )
      ) : null}
      {listFooterNote}
      {showAddOptionInUi ? (
        <div
          role="presentation"
          className={`px-2 py-1 ${suggestions.length > 0 ? "mt-0.5 border-t border-[color:var(--cab-border)] pt-2" : ""}`}
        >
          {suggestions.length === 0 && fuzzyLabel ? (
            <p className="px-2 pb-1.5 text-xs text-[color:var(--cab-text-muted)]">
              Forse cercavi:{" "}
              <button
                type="button"
                className="font-semibold text-[color:var(--cab-primary)] underline-offset-2 hover:underline"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  if (itemsMode && fuzzySuggestion && typeof fuzzySuggestion === "object") {
                    selectItem(fuzzySuggestion as ListSelectItem, false);
                  } else if (typeof fuzzySuggestion === "string") {
                    selectString(fuzzySuggestion, false);
                  }
                }}
              >
                {fuzzyLabel}
              </button>
            </p>
          ) : null}
          {suggestions.length === 0 && !fuzzyLabel && addCandidate ? (
            <p className="px-2 pb-1.5 text-xs font-medium text-[color:var(--cab-text-muted)]">
              {emptyMessage}
            </p>
          ) : null}
          {hasMultiAdd
            ? addActionsList.map((action, actionIdx) => {
                const optionIndex = suggestions.length + actionIdx;
                const optionActive = activeIndex === optionIndex;
                const optionDom = `${listboxId}-add-${action.id}`;
                const label = addPending
                  ? "Aggiunta in corso…"
                  : addOptionEnabled && addCandidate
                    ? action.label(addCandidate)
                    : action.label("");
                return (
                  <Tooltip
                    key={action.id}
                    content={
                      addOptionEnabled
                        ? undefined
                        : useSheet && sheetUsesSearch
                          ? "Scrivi nel campo Cerca in alto"
                          : "Digita un valore da aggiungere"
                    }
                  >
                    <button
                      id={optionDom}
                      type="button"
                      role="option"
                      aria-selected={optionActive}
                      className={addOptionBtnClass(optionActive)}
                      disabled={!addOptionEnabled || addPending}
                      aria-disabled={!addOptionEnabled || addPending}
                      onMouseDown={(e) => {
        e.preventDefault();
        if (blurTimer.current)
            clearTimeout(blurTimer.current);
        if (addOptionEnabled && !addPending)
            void runAddAction(actionIdx);
    }} onMouseEnter={() => {
        if (!sheetOpen)
            setActiveIndex(optionIndex);
    }}>
                    <span className={addOptionEnabled ? "" : "opacity-70"} aria-hidden>
                      +
                    </span>
                    {label}
                  </button></Tooltip>
                );
              })
            : (
              <Tooltip content={addOptionEnabled
                    ? undefined
                    : useSheet && sheetUsesSearch
                      ? "Scrivi nel campo Cerca in alto"
                      : "Digita un valore da aggiungere"}><button id={addOptionDomId} type="button" role="option" aria-selected={isAddActiveIndex(activeIndex)} className={addOptionBtnClass(isAddActiveIndex(activeIndex))} disabled={!addOptionEnabled} aria-disabled={!addOptionEnabled} onMouseDown={(e) => {
        e.preventDefault();
        if (blurTimer.current)
            clearTimeout(blurTimer.current);
        if (addOptionEnabled)
            void runAdd();
    }} onMouseEnter={() => {
        if (!sheetOpen && addOptionIndex >= 0)
            setActiveIndex(addOptionIndex);
    }}>
                <span className={addOptionEnabled ? "" : "opacity-70"} aria-hidden>
                  +
                </span>
                {singleAddOptionLabel}
              </button></Tooltip>
            )}
        </div>
      ) : null}
    </>
  );

  const dropdownPortal =
    portalOpen && portalStyle ? (
      showDropdown && totalNavigableOptions > 0 ? (
        <div
          ref={listScrollRef}
          id={listboxId}
          role="listbox"
          style={portalStyle}
          className={dropdownPanelClass}
        >
          {optionsListBody}
        </div>
      ) : showDropdown && listEmpty ? (
        <div
          ref={listScrollRef}
          id={listboxId}
          role="status"
          style={portalStyle}
          className={globalAutocompleteDropdownPortalPanel}
        >
          {emptyStateNode}
        </div>
      ) : null
    ) : null;

  const loadingPlaceholder = "Caricamento elenco…";
  const resolvedPlaceholder = showLoadingUi ? loadingPlaceholder : placeholder;
  const inputFieldClass = `${fieldClass}${showInvalid ? globalInputInvalidRing : ""}${showClearBtn ? " pr-10" : ""}`;

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`.trim()}>
      <input
        ref={inputRef}
        id={inputId}
        aria-label={ariaLabel}
        className={inputFieldClass}
        value={displayValue}
        onChange={(e) => {
          if (effectiveSelectOnly || useSheetTriggerMode) return;
          const next = e.target.value;
          editSessionRef.current.modified = true;
          setFocused(true);
          setQuery(next);
          startTransition(() => {
            setSelectorOpen(true);
            setActiveIndex(-1);
          });
          if (next === "") {
            if (!isFilterVariant) onChange("");
            else if (canClearCommittedFilter()) onChange("");
          }
        }}
        onMouseDown={useSheetTriggerMode || effectiveSelectOnly ? handleSheetTriggerMouseDown : undefined}
        onClick={() => {
          if (useSheetTriggerMode) {
            handleSheetTriggerClick();
            return;
          }
          if (effectiveSelectOnly) {
            handleSelectOnlyTriggerClick();
            return;
          }
          if (!open) beginEditing();
        }}
        readOnly={useSheetTriggerMode || effectiveSelectOnly || undefined}
        onBlur={() => {
          if (shouldIgnoreBlurDuringSelection()) return;
          if (useSheetTriggerMode) {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            return;
          }
          blurTimer.current = setTimeout(commitBlur, 120);
        }}
        onFocus={() => {
          if (inputRef.current) onFocusIn(inputRef.current);
          if (useSheetTriggerMode) return;
          if (!effectiveSelectOnly) beginEditing();
        }}
        onKeyDown={onInputKeyDown}
        disabled={disabled || showLoadingUi}
        required={required && !strictFromList}
        placeholder={resolvedPlaceholder}
        autoComplete="off"
        enterKeyHint={useSheetTriggerMode ? (sheetUsesSearch ? "search" : "done") : effectiveSelectOnly ? "done" : "search"}
        role={useSheetTriggerMode ? "button" : "combobox"}
        aria-haspopup={useSheetTriggerMode ? "listbox" : undefined}
        aria-expanded={showDropdown && (totalNavigableOptions > 0 || listEmpty)}
        aria-controls={showDropdown && !useSheetTriggerMode ? listboxId : undefined}
        aria-activedescendant={useSheetTriggerMode ? undefined : activeDescendantId}
        aria-invalid={showInvalid || undefined}
        aria-autocomplete={useSheetTriggerMode || effectiveSelectOnly ? "none" : "list"}
        aria-readonly={useSheetTriggerMode || effectiveSelectOnly || undefined}
        aria-busy={showLoadingUi || addPending || undefined}
      />
      {showClearBtn ? (
        <button
          type="button"
          className={globalInputComboboxClearBtn}
          aria-label="Svuota selezione"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClear}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null}
      {typeof document !== "undefined" && dropdownPortal ? createPortal(dropdownPortal, document.body) : null}
      {sheetOpen ? (
      <GestionaleSearchableSheetSelect
        open={sheetOpen}
        onOpenChange={(next) => {
          if (!next) closeAndReset();
          else setSelectorOpen(true);
        }}
        title={resolvedSheetTitle}
        showSearch={sheetUsesSearch}
        searchValue={sheetQuery}
        onSearchChange={(v) => {
          setQuery(v);
          setActiveIndex(-1);
        }}
        searchPlaceholder={placeholder ?? "Cerca…"}
        searchAriaLabel={ariaLabel ? `Cerca in ${ariaLabel}` : undefined}
        listScrollRef={sheetListScrollRef}
        searchInputRef={sheetSearchRef}
        onSearchFocus={() => {
          if (sheetSearchRef.current) onFocusIn(sheetSearchRef.current);
        }}
        onSearchKeyDown={onSheetSearchKeyDown}
        comboboxAria={
          useSheetTriggerMode && sheetUsesSearch
            ? {
                listboxId,
                activeDescendantId,
                expanded: showDropdown && (totalNavigableOptions > 0 || listEmpty),
              }
            : undefined
        }
      >
        <div id={listboxId} role="listbox">
          {sheetListReady ? (
            <>
              {optionsListBody}
              {listEmpty ? emptyStateNode : null}
            </>
          ) : (
            <div
              aria-busy="true"
              aria-label="Caricamento elenco"
              className="min-h-[12rem] px-3 py-4"
            />
          )}
        </div>
      </GestionaleSearchableSheetSelect>
      ) : null}
      {showInvalid ? (
        <p className="mt-1 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]">
          {invalidMessage}
        </p>
      ) : null}
      <EntitySimilarWarning similarTo={similarTo} />
    </div>
  );
}
