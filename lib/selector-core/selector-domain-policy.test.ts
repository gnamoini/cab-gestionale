import assert from "node:assert/strict";
import {
  isSelectorDomainSheetRolloutEnabled,
  isSelectorSheetEligible,
  isSelectOnlyPolicyViolation,
  MOBILE_SHEET_MIN_OPTIONS,
  shouldUpgradeToSearch,
} from "@/lib/selector-core/selector-domain-policy";

assert.equal(MOBILE_SHEET_MIN_OPTIONS, 20);

assert.equal(isSelectorDomainSheetRolloutEnabled("addetti"), true);
assert.equal(isSelectorDomainSheetRolloutEnabled("report"), false);

assert.equal(
  isSelectorSheetEligible({ isMobile: true, optionCount: 21, domain: "addetti" }),
  true,
);
assert.equal(
  isSelectorSheetEligible({ isMobile: true, optionCount: 20, domain: "addetti" }),
  false,
);

assert.equal(
  isSelectOnlyPolicyViolation({ selectOnly: true, dynamicList: true }),
  true,
);
assert.equal(
  isSelectOnlyPolicyViolation({ selectOnly: true, domain: "addetti" }),
  true,
);
assert.equal(
  isSelectOnlyPolicyViolation({ selectOnly: true, domain: "report" }),
  false,
);

assert.equal(shouldUpgradeToSearch({ optionCount: 10, dynamicList: true }), true);
assert.equal(shouldUpgradeToSearch({ optionCount: 10 }), false);

console.log("selector-domain-policy.test.ts OK");
