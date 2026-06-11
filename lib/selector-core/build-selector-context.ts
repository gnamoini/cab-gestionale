import type { SelectorContext, SelectorDomain } from "@/lib/selector-core/types";

export type BuildSelectorContextInput = {
  selectorDomain?: SelectorDomain | string;
  rolloutKey?: string;
  selectOnly?: boolean;
  mobileSheetMode?: "selectOnly" | "searchable" | "off";
  mobileSheet?: boolean;
  sheetSearchableEnabled?: boolean;
  dynamicList?: boolean;
  operationalFilter?: boolean;
  isMobile: boolean;
  optionCount: number;
  userRole?: string;
  minSheetOptions?: number;
};

function resolveMode(input: BuildSelectorContextInput): SelectorContext["mode"] {
  if (input.selectOnly) return "selectOnly";
  if (input.mobileSheetMode === "searchable" || input.sheetSearchableEnabled) return "searchable";
  return "default";
}

function resolveDomain(input: BuildSelectorContextInput): SelectorDomain | string {
  if (input.selectorDomain?.trim()) return input.selectorDomain.trim();
  if (input.rolloutKey?.trim()) return input.rolloutKey.trim();
  return "unknown";
}

export function buildSelectorContext(input: BuildSelectorContextInput): SelectorContext {
  return {
    domain: resolveDomain(input),
    mode: resolveMode(input),
    optionCount: input.optionCount,
    isMobile: input.isMobile,
    isDynamicList: input.dynamicList ?? false,
    isOperationalFilter: input.operationalFilter ?? false,
    rolloutKey: input.rolloutKey,
    userRole: input.userRole,
    mobileSheetEnabled: input.mobileSheet ?? true,
    mobileSheetMode: input.mobileSheetMode,
    minSheetOptions: input.minSheetOptions,
  };
}
