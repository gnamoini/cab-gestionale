import assert from "node:assert/strict";
import { validateRenameConsistency, configurationOnlyHealth } from "@/lib/settings/rename-engine/rename-health-check";
import { buildRenamePlan } from "@/lib/settings/rename-engine/rename-plan";
import { buildImpactFromCounts } from "@/lib/settings/rename-engine/rename-validate";

const plan = buildRenamePlan({ kind: "cliente", oldLabel: "A", newLabel: "B" });
const impact = buildImpactFromCounts([
  {
    operationId: "cliente.mezzi.cliente",
    table: "mezzi",
    policy: "live",
    updatable: 32,
    protected: 0,
    total: 32,
  },
]);

const fail = validateRenameConsistency({
  plan,
  impact,
  oldLabelResiduals: { "cliente.mezzi.cliente": 1 },
  newLabelCounts: { "cliente.mezzi.cliente": 30 },
});
assert.equal(fail.status, "failed");

const ok = validateRenameConsistency({
  plan,
  impact,
  oldLabelResiduals: { "cliente.mezzi.cliente": 0 },
  newLabelCounts: { "cliente.mezzi.cliente": 32 },
});
assert.equal(ok.status, "healthy");

const cfg = configurationOnlyHealth();
assert.equal(cfg.status, "warning");

console.log("settings-rename-health-status.test.ts OK");
