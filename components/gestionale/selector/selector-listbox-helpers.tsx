"use client";

import {
  globalAutocompleteOptionClass,
  globalAutocompleteOptionPillClass,
} from "@/lib/ui/global-input";
import { normListSelectValue } from "@/lib/ui/list-select-utils";
import type { ListSelectItem } from "@/lib/ui/list-select-items";
import type { CSSProperties, ReactNode } from "react";
import type { SelectorOptionRenderContext } from "@/components/gestionale/selector/selector-listbox";
import { HighlightSearchMatch } from "@/components/gestionale/global-input/highlight-search-match";

export type DefaultStringRenderOptionParams = {
  highlightQuery?: string;
  highlightSearch?: boolean;
  onPointerSelect: (e: React.PointerEvent, select: () => void) => void;
};

export function defaultStringRenderOption(
  params: DefaultStringRenderOptionParams,
): (ctx: SelectorOptionRenderContext<string>) => ReactNode {
  const { highlightQuery = "", highlightSearch = true, onPointerSelect } = params;
  return ({ item, active, selected, optionId, onSelect, onMouseEnter }) => (
    <div key={item} role="presentation" className="py-0.5">
      <button
        id={optionId}
        type="button"
        role="option"
        aria-selected={selected}
        className={globalAutocompleteOptionClass(active, selected)}
        onPointerDown={(e) => onPointerSelect(e, onSelect)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseEnter={onMouseEnter}
      >
        {highlightSearch && highlightQuery.trim() ? (
          <HighlightSearchMatch text={item} query={highlightQuery} />
        ) : (
          item
        )}
      </button>
    </div>
  );
}

export type DefaultItemRenderOptionParams = {
  value: string;
  coloredOptions?: boolean;
  highlightQuery?: string;
  highlightSearch?: boolean;
  onPointerSelect: (e: React.PointerEvent, select: () => void) => void;
};

export function defaultItemRenderOption(
  params: DefaultItemRenderOptionParams,
): (ctx: SelectorOptionRenderContext<ListSelectItem & { pillStyle?: CSSProperties }>) => ReactNode {
  const {
    value,
    coloredOptions = false,
    highlightQuery = "",
    highlightSearch = true,
    onPointerSelect,
  } = params;
  return ({ item, active, selected, optionId, onSelect, onMouseEnter }) => {
    const isSelected = item.value === value;
    const btnClass =
      coloredOptions && item.pillStyle
        ? globalAutocompleteOptionPillClass(active, isSelected, item.pillStyle)
        : globalAutocompleteOptionClass(active, isSelected);
    return (
      <div key={item.value} role="presentation" className="py-0.5">
        <button
          id={optionId}
          type="button"
          role="option"
          aria-selected={isSelected}
          style={coloredOptions ? item.pillStyle : undefined}
          className={btnClass}
          onPointerDown={(e) => onPointerSelect(e, onSelect)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseEnter={onMouseEnter}
        >
          {highlightSearch && highlightQuery.trim() ? (
            <HighlightSearchMatch text={item.label} query={highlightQuery} />
          ) : (
            item.label
          )}
        </button>
      </div>
    );
  };
}

export function normOptionSelected(option: string, selectedValue: string): boolean {
  return normListSelectValue(option) === normListSelectValue(selectedValue);
}
