import assert from "node:assert/strict";
import { suggestPartReplacedAtRegistration } from "@/lib/maintenance-plans/suggest-part-replaced";

assert.equal(
  suggestPartReplacedAtRegistration({
    replacementCondition: "sempre",
    conditionParams: null,
    isRequired: true,
    executionCount: 1,
  }),
  true,
);

assert.equal(
  suggestPartReplacedAtRegistration({
    replacementCondition: "ogni_n_tagliandi",
    conditionParams: { n: 2 },
    isRequired: false,
    executionCount: 1,
  }),
  false,
);

console.log("suggest-part-replaced.test.ts OK");
