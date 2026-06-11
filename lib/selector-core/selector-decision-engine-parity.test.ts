import assert from "node:assert/strict";
import {
  SelectorDecisionEngine,
  toLegacySurface,
} from "@/lib/selector-core/selector-decision-engine";
import { resolveSelectorSurface } from "@/lib/selector-core/resolve-selector-surface";
import type { ResolveSelectorSurfaceInput } from "@/lib/selector-core/resolve-selector-surface";
import { buildSelectorContext } from "@/lib/selector-core/build-selector-context";

/** Frozen v2 matrix — engine must match legacy adapter surface. */
const PARITY_MATRIX: ResolveSelectorSurfaceInput[] = [
  { isMobile: true, optionCount: 20, selectOnly: true, selectorDomain: "addetti" },
  { isMobile: true, optionCount: 21, selectOnly: true, selectorDomain: "addetti" },
  { isMobile: true, optionCount: 25, selectOnly: true, selectorDomain: "report" },
  {
    isMobile: true,
    optionCount: 25,
    selectOnly: false,
    mobileSheetMode: "searchable",
    selectorDomain: "mezzi",
  },
  { isMobile: false, optionCount: 100, selectOnly: true, selectorDomain: "addetti" },
  { isMobile: true, optionCount: 21, selectOnly: true, selectorDomain: "addetti", mobileSheet: false },
  { isMobile: true, optionCount: 21, selectOnly: true, selectorDomain: "addetti", mobileSheetMode: "off" },
  {
    isMobile: true,
    optionCount: 25,
    selectOnly: false,
    mobileSheetMode: "selectOnly",
    selectorDomain: "mezzi",
  },
  {
    isMobile: true,
    optionCount: 25,
    selectOnly: false,
    mobileSheetMode: "searchable",
    selectorDomain: "report",
  },
  { isMobile: true, optionCount: 5, selectOnly: true, selectorDomain: "lavorazioni" },
  { isMobile: true, optionCount: 50, selectOnly: true, selectorDomain: "schede" },
  { isMobile: true, optionCount: 50, selectOnly: true, selectorDomain: "magazzino" },
  { isMobile: true, optionCount: 50, selectOnly: true, selectorDomain: "dipendenti" },
  {
    isMobile: true,
    optionCount: 50,
    selectOnly: false,
    mobileSheetMode: "searchable",
    selectorDomain: "addetti",
  },
  {
    isMobile: true,
    optionCount: 50,
    selectOnly: false,
    mobileSheetMode: "searchable",
    selectorDomain: "lavorazioni",
  },
  { isMobile: true, optionCount: 21, selectOnly: true, rolloutKey: "legacy-key" },
  {
    isMobile: true,
    optionCount: 25,
    selectOnly: false,
    mobileSheetMode: "searchable",
    rolloutKey: "legacy-key",
  },
  { isMobile: true, optionCount: 21, selectOnly: true, selectorDomain: "dashboard_filters" },
  {
    isMobile: true,
    optionCount: 25,
    selectOnly: false,
    mobileSheetMode: "searchable",
    selectorDomain: "dashboard_filters",
  },
  { isMobile: true, optionCount: 21, selectOnly: true, selectorDomain: "security" },
];

for (const input of PARITY_MATRIX) {
  const legacy = resolveSelectorSurface(input);
  const ctx = buildSelectorContext({
    selectorDomain: input.selectorDomain,
    rolloutKey: input.rolloutKey,
    selectOnly: input.selectOnly,
    mobileSheetMode: input.mobileSheetMode,
    mobileSheet: input.mobileSheet,
    sheetSearchableEnabled: input.sheetSearchableEnabled ?? input.mobileSheetMode === "searchable",
    isMobile: input.isMobile,
    optionCount: input.optionCount,
    minSheetOptions: input.minSheetOptions,
  });
  const engine = toLegacySurface(SelectorDecisionEngine.resolve(ctx));
  assert.equal(
    engine,
    legacy,
    `parity mismatch: ${JSON.stringify(input)} engine=${engine} legacy=${legacy}`,
  );
}

console.log(`selector-decision-engine-parity.test.ts OK (${PARITY_MATRIX.length} cases)`);
