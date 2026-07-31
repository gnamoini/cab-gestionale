import type { CSSProperties } from "react";
import type { ListSelectItem } from "@/lib/ui/list-select-items";
import {
  globalInputFieldDefault,
  globalInputFieldFilterSearch,
  globalInputFieldFilterSelect,
} from "@/lib/ui/global-input";
import type { SelectorDomain } from "@/lib/selector-core/types";

export type GlobalSelectOption = ListSelectItem & { pillStyle?: CSSProperties };

export type GlobalSelectAddAction = {
  id: string;
  label: (candidate: string) => string;
  onAdd: (value: string) => void | Promise<string | null | void> | string | null;
};

export type GlobalSelectBaseProps = {
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  variant?: "default" | "filter";
  inputClassName?: string;
  id?: string;
  strictFromList?: boolean;
  invalidMessage?: string;
  forceInvalid?: boolean;
  onValidityChange?: (valid: boolean) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  allowAdd?: boolean;
  canAdd?: boolean;
  addPending?: boolean;
  onAddToList?: (value: string) => void | Promise<string | null | void> | string | null;
  addActions?: readonly GlobalSelectAddAction[];
  coloredOptions?: boolean;
  filterNeutralValues?: readonly string[];
  "aria-label"?: string;
  showSimilarWarning?: boolean;
  similarStandardizeLegalSuffix?: boolean;
  selectOnly?: boolean;
  mobileSheet?: boolean;
  mobileSheetMode?: "selectOnly" | "searchable" | "off";
  rolloutKey?: string;
  selectorDomain?: SelectorDomain;
  dynamicList?: boolean;
  operationalFilter?: boolean;
  sheetTitle?: string;
  recentsKey?: string;
  alphabeticalBrowse?: boolean;
  preserveItemOrder?: boolean;
  highlightSearch?: boolean;
  minSheetOptions?: number;
  exclusiveGroup?: string;
  /** Mostra pulsante svuota quando c'è un valore e il campo non è obbligatorio. */
  clearable?: boolean;
  /** Voce value="" in elenco ma input a riposo vuoto (placeholder). */
  hideEmptyOptionInInput?: boolean;
};

export type GlobalSelectStringProps = GlobalSelectBaseProps & {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  items?: never;
};

export type GlobalSelectItemsProps = GlobalSelectBaseProps & {
  value: string;
  onChange: (value: string) => void;
  items: readonly GlobalSelectOption[];
  options?: never;
};

export type GlobalSelectProps = GlobalSelectStringProps | GlobalSelectItemsProps;

export const EMPTY_SUGGESTIONS: (string | ListSelectItem)[] = [];

export function fieldClassForVariant(
  variant: "default" | "filter",
  inputClassName?: string,
  selectOnly?: boolean,
): string {
  if (inputClassName) return inputClassName;
  if (variant === "filter") {
    return selectOnly ? globalInputFieldFilterSelect : globalInputFieldFilterSearch;
  }
  return globalInputFieldDefault;
}

export function isFilterNeutralValue(value: string, neutralValues?: readonly string[]): boolean {
  if (!value.trim()) return true;
  if (!neutralValues?.length) return false;
  return neutralValues.includes(value);
}
