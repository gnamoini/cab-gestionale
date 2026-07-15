import assert from "node:assert/strict";
import {
  SelectorDecisionEngine,
  toLegacySurface,
} from "@/lib/selector-core/selector-decision-engine";
import type { SelectorContext } from "@/lib/selector-core/types";

function ctx(partial: Partial<SelectorContext> & Pick<SelectorContext, "optionCount">): SelectorContext {
  return {
    domain: "addetti",
    mode: "selectOnly",
    isMobile: partial.isMobile ?? true,
    isDynamicList: partial.isDynamicList ?? false,
    isOperationalFilter: partial.isOperationalFilter ?? false,
    ...partial,
  };
}

function stable(decision: ReturnType<typeof SelectorDecisionEngine.resolve>) {
  return {
    surface: decision.surface,
    reasoning: decision.reasoning,
    flags: decision.flags,
    matchedRules: decision.matchedRules,
    fallbackUsed: decision.fallbackUsed,
  };
}

assert.equal(
  toLegacySurface(
    SelectorDecisionEngine.resolve(ctx({ optionCount: 20, domain: "addetti" })),
  ),
  "dropdown",
  "20 opzioni non supera soglia sheet (>20)",
);

assert.equal(
  toLegacySurface(
    SelectorDecisionEngine.resolve(ctx({ optionCount: 21, domain: "addetti" })),
  ),
  "sheet",
);

assert.equal(
  toLegacySurface(
    SelectorDecisionEngine.resolve(
      ctx({ optionCount: 25, domain: "report", mode: "selectOnly" }),
    ),
  ),
  "dropdown",
  "report domain DISABLED for sheet",
);

assert.equal(
  toLegacySurface(
    SelectorDecisionEngine.resolve({
      domain: "mezzi",
      mode: "searchable",
      optionCount: 25,
      isMobile: true,
      isDynamicList: false,
      isOperationalFilter: false,
      mobileSheetMode: "searchable",
    }),
  ),
  "sheet",
);

assert.equal(
  toLegacySurface(
    SelectorDecisionEngine.resolve(
      ctx({ optionCount: 100, isMobile: false, domain: "addetti" }),
    ),
  ),
  "dropdown",
);

assert.equal(
  SelectorDecisionEngine.resolve(
    ctx({ optionCount: 25, mobileSheetMode: "off" }),
  ).surface,
  "dropdown",
);

const policyDecision = SelectorDecisionEngine.resolve({
  domain: "addetti",
  mode: "selectOnly",
  optionCount: 25,
  isMobile: true,
  isDynamicList: true,
  isOperationalFilter: false,
});
assert.ok(
  policyDecision.reasoning.some((r) => r.includes("policy")),
  "dynamic list + selectOnly → policy note in reasoning",
);

const addettoListOnlySheet = SelectorDecisionEngine.resolve({
  domain: "addetti",
  mode: "selectOnly",
  optionCount: 25,
  isMobile: true,
  isDynamicList: true,
  isOperationalFilter: false,
  mobileSheetMode: "selectOnly",
});
assert.equal(addettoListOnlySheet.surface, "sheet");
assert.equal(addettoListOnlySheet.flags.usesSheet, true);
assert.equal(addettoListOnlySheet.flags.usesSearch, false);

const mezziSearchableEmpty = SelectorDecisionEngine.resolve({
  domain: "mezzi",
  mode: "searchable",
  optionCount: 0,
  isMobile: true,
  isDynamicList: true,
  isOperationalFilter: false,
  mobileSheetMode: "searchable",
  minSheetOptions: 0,
});
assert.equal(mezziSearchableEmpty.surface, "sheet");
assert.equal(mezziSearchableEmpty.flags.usesSearch, true);

const operationalFilterSheet = SelectorDecisionEngine.resolve({
  domain: "unknown",
  mode: "selectOnly",
  optionCount: 3,
  isMobile: true,
  isOperationalFilter: true,
  mobileSheetMode: "selectOnly",
  minSheetOptions: 0,
});
assert.equal(operationalFilterSheet.surface, "sheet");
assert.equal(operationalFilterSheet.flags.usesSheet, true);

const deterministic = stable(
  SelectorDecisionEngine.resolve(ctx({ optionCount: 21, domain: "addetti" })),
);
for (let i = 0; i < 100; i++) {
  const again = stable(
    SelectorDecisionEngine.resolve(ctx({ optionCount: 21, domain: "addetti" })),
  );
  assert.deepEqual(again, deterministic);
}

const invalidDecision = SelectorDecisionEngine.resolve({
  domain: "addetti",
  mode: "selectOnly",
  optionCount: Number.NaN,
  isMobile: true,
  isDynamicList: false,
  isOperationalFilter: false,
});
assert.equal(invalidDecision.fallbackUsed, true);
assert.equal(invalidDecision.surface, "dropdown");

const searchableDesktop = SelectorDecisionEngine.resolve({
  domain: "addetti",
  mode: "default",
  optionCount: 100,
  isMobile: false,
  isDynamicList: false,
  isOperationalFilter: false,
});
assert.equal(searchableDesktop.surface, "searchableDropdown");
assert.equal(searchableDesktop.flags.usesSearch, true);
assert.equal(searchableDesktop.flags.usesSheet, false);

console.log("selector-decision-engine.test.ts OK");
