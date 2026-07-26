import assert from "node:assert/strict";
import { canReverseRename } from "@/lib/settings/rename-engine/rename-reverse";
import { buildRenamePlan } from "@/lib/settings/rename-engine/rename-plan";

const plan = buildRenamePlan({ kind: "cliente", oldLabel: "Si.eco", newLabel: "SI.ECO" });
const job = {
  id: "j1",
  kind: "cliente",
  entity_id: null,
  entity_key: plan.entityKey ?? null,
  old_label: plan.oldLabel,
  new_label: plan.newLabel,
  status: "completed",
  plan_json: plan,
  parent_job_id: null,
};

const blocked = canReverseRename(job, { currentLabelInSettings: "SI.ECO Bari" });
assert.equal(blocked.eligible, false);

const ok = canReverseRename(job, { currentLabelInSettings: "SI.ECO" });
assert.equal(ok.eligible, true);

console.log("settings-rename-reverse-guard.test.ts OK");
