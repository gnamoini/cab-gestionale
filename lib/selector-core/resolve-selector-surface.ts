import { buildSelectorContext } from "@/lib/selector-core/build-selector-context";
import {
  SelectorDecisionEngine,
  toLegacySurface,
} from "@/lib/selector-core/selector-decision-engine";
import type { SelectorDomain } from "@/lib/selector-core/types";
import type { SelectorSurface } from "@/lib/selector-core/types";

export type ResolveSelectorSurfaceInput = {
  isMobile: boolean;
  optionCount: number;
  selectOnly: boolean;
  mobileSheet?: boolean;
  minSheetOptions?: number;
  sheetSearchableEnabled?: boolean;
  rolloutKey?: string;
  selectorDomain?: SelectorDomain;
  mobileSheetMode?: "selectOnly" | "searchable" | "off";
};

function mapLegacyInputToSelectorContext(input: ResolveSelectorSurfaceInput) {
  return buildSelectorContext({
    selectorDomain: input.selectorDomain,
    rolloutKey: input.rolloutKey,
    selectOnly: input.selectOnly,
    mobileSheetMode: input.mobileSheetMode,
    mobileSheet: input.mobileSheet,
    sheetSearchableEnabled: input.sheetSearchableEnabled,
    isMobile: input.isMobile,
    optionCount: input.optionCount,
    minSheetOptions: input.minSheetOptions,
  });
}

/** @deprecated Prefer SelectorDecisionEngine.resolve — adapter legacy sottile. */
export function resolveSelectorSurface(input: ResolveSelectorSurfaceInput): SelectorSurface {
  const ctx = mapLegacyInputToSelectorContext(input);
  const decision = SelectorDecisionEngine.resolve(ctx);
  return toLegacySurface(decision);
}
