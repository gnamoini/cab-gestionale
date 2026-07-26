import assert from "node:assert/strict";
import { RENAME_ENGINE_VERSION, RENAME_PLAN_VERSION } from "@/lib/settings/rename-engine/constants";
import { buildRenamePlan, invertRenamePlan } from "@/lib/settings/rename-engine/rename-plan";

const plan = buildRenamePlan({ kind: "cliente", oldLabel: "Si.eco", newLabel: "SI.ECO" });
assert.equal(plan.engineVersion, RENAME_ENGINE_VERSION);
assert.equal(plan.planVersion, RENAME_PLAN_VERSION);

const reversed = invertRenamePlan(plan, "corr-2");
assert.equal(reversed.oldLabel, "SI.ECO");
assert.equal(reversed.newLabel, "Si.eco");
assert.equal(reversed.entityKey, plan.entityKey);

console.log("settings-rename-plan-version.test.ts OK");
