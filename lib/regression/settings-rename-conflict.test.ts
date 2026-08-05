import assert from "node:assert/strict";
import { detectRenameConflicts } from "@/lib/settings/rename-engine/rename-conflict";
import { buildRenamePlan } from "@/lib/settings/rename-engine/rename-plan";
import { validateRenamePlan } from "@/lib/settings/rename-engine/rename-validate";

const plan = buildRenamePlan({ kind: "cliente", oldLabel: "Cliente Alpha", newLabel: "Cliente Beta" });
const blocked = detectRenameConflicts(plan, {
  existingLabels: ["A", "Cliente Beta", "B"],
});
assert.equal(blocked.blocked, true);
assert.ok(blocked.conflicts.some((c) => c.code === "name_exists"));

const ok = detectRenameConflicts(plan, { existingLabels: ["Cliente Alpha", "Altro"] });
assert.equal(ok.blocked, false);

const utilPlan = buildRenamePlan({ kind: "utilizzatore", oldLabel: "A SPA", newLabel: "A" });
const dup = validateRenamePlan(utilPlan, {
  existingLabels: ["A"],
  catalogBeforeRename: ["A SPA", "A"],
});
assert.equal(dup.status, "blocked");
assert.ok(dup.checks.some((c) => c.name === "duplicate_target_policy"));

console.log("settings-rename-conflict.test.ts OK");
