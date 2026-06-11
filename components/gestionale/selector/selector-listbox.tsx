"use client";

import type { ReactNode, RefObject, MutableRefObject } from "react";
import { GlobalVirtualizedListbox } from "@/components/gestionale/global-input/global-virtualized-listbox";

export type SelectorOptionRenderContext<T> = {
  item: T;
  index: number;
  active: boolean;
  selected: boolean;
  optionId: string;
  onSelect: () => void;
  onMouseEnter: () => void;
};

export type SelectorListboxProps<T> = {
  suggestions: readonly T[];
  activeIndex: number;
  selectedValue: string;
  getOptionId: (item: T, index: number) => string;
  getOptionKey: (item: T) => string;
  renderOption: (ctx: SelectorOptionRenderContext<T>) => ReactNode;
  onSelect: (item: T) => void;
  onActiveIndexChange: (index: number) => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
  scrollToRowRef?: MutableRefObject<((index: number) => void) | null>;
  externalScrollHost?: boolean;
  hoverActivatesIndex?: boolean;
  className?: string;
};

export function SelectorListbox<T>({
  suggestions,
  activeIndex,
  selectedValue,
  getOptionId,
  getOptionKey,
  renderOption,
  onSelect,
  onActiveIndexChange,
  scrollRef,
  scrollToRowRef,
  externalScrollHost = false,
  hoverActivatesIndex = true,
  className = "",
}: SelectorListboxProps<T>) {
  const renderRow = (index: number) => {
    const item = suggestions[index]!;
    const active = index === activeIndex;
    const selected = getOptionKey(item) === selectedValue;
    const optionId = getOptionId(item, index);
    return renderOption({
      item,
      index,
      active,
      selected,
      optionId,
      onSelect: () => onSelect(item),
      onMouseEnter: hoverActivatesIndex ? () => onActiveIndexChange(index) : () => {},
    });
  };

  if (suggestions.length === 0) return null;

  return (
    <GlobalVirtualizedListbox
      rowCount={suggestions.length}
      estimateRowHeight={44}
      scrollRef={scrollRef}
      scrollToRowRef={scrollToRowRef}
      externalScrollHost={externalScrollHost}
      className={className}
      renderRow={renderRow}
    />
  );
}
