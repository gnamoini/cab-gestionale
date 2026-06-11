import assert from "node:assert/strict";
import {
  SelectorDecisionEngine,
  __resetSelectorEngineForTests,
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

__resetSelectorEngineForTests();

// operational filter searchable mobile
const operational = SelectorDecisionEngine.resolve({
  domain: "lavorazioni",
  mode: "searchable",
  optionCount: 25,
  isMobile: true,
  isDynamicList: false,
  isOperationalFilter: true,
  mobileSheetMode: "searchable",
});
assert.ok(operational.flags.usesSearch, "operational filter searchable uses search");
assert.equal(operational.surface, "sheet");

// static enum desktop selectOnly
const staticEnum = SelectorDecisionEngine.resolve(
  ctx({ optionCount: 15, isMobile: false, mode: "selectOnly" }),
);
assert.equal(staticEnum.surface, "dropdown");
assert.equal(staticEnum.flags.usesSearch, false);

// dynamic mobile >20 must not be selectOnly-only dropdown
const dynamicMobile = SelectorDecisionEngine.resolve({
  domain: "addetti",
  mode: "selectOnly",
  optionCount: 25,
  isMobile: true,
  isDynamicList: true,
  isOperationalFilter: false,
});
assert.ok(
  dynamicMobile.surface === "sheet" || dynamicMobile.flags.usesSearch,
  "dynamic mobile large list avoids plain dropdown",
);

// forced off allowed
const forcedOff = SelectorDecisionEngine.resolve(
  ctx({ optionCount: 25, mobileSheetMode: "off", isDynamicList: true }),
);
assert.equal(forcedOff.surface, "dropdown");

// security GRADUAL env off
const prevGradual = process.env.SELECTOR_SECURITY_GRADUAL;
process.env.SELECTOR_SECURITY_GRADUAL = "false";
__resetSelectorEngineForTests();
const securityOff = SelectorDecisionEngine.resolve(
  ctx({ optionCount: 25, domain: "security", mode: "selectOnly" }),
);
assert.equal(toLegacySurface(securityOff), "dropdown");

// security GRADUAL env on
process.env.SELECTOR_SECURITY_GRADUAL = "true";
__resetSelectorEngineForTests();
const securityOn = SelectorDecisionEngine.resolve(
  ctx({ optionCount: 25, domain: "security", mode: "selectOnly" }),
);
assert.equal(toLegacySurface(securityOn), "sheet");
process.env.SELECTOR_SECURITY_GRADUAL = prevGradual;

// invalid NaN → fallback
__resetSelectorEngineForTests();
const invalid = SelectorDecisionEngine.resolve({
  domain: "addetti",
  mode: "selectOnly",
  optionCount: Number.NaN,
  isMobile: true,
  isDynamicList: false,
  isOperationalFilter: false,
});
assert.equal(invalid.surface, "dropdown");
assert.equal(invalid.fallbackUsed, true);

console.log("selector-ux-intent.test.ts OK");
