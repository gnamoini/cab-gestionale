import assert from "node:assert/strict";
import { detectRenameConflicts } from "@/lib/settings/rename-engine/rename-conflict";
import { buildRenamePlan } from "@/lib/settings/rename-engine/rename-plan";

const plan = buildRenamePlan({ kind: "cliente", oldLabel: "Cliente Alpha", newLabel: "Cliente Beta" });
const blocked = detectRenameConflicts(plan, {
  existingLabels: ["A", "Cliente Beta", "B"],
});
assert.equal(blocked.blocked, true);
assert.ok(blocked.conflicts.some((c) => c.code === "name_exists"));

const ok = detectRenameConflicts(plan, { existingLabels: ["Cliente Alpha", "Altro"] });
assert.equal(ok.blocked, false);

console.log("settings-rename-conflict.test.ts OK");
