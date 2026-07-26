import assert from "node:assert/strict";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import { buildRenamePlan } from "@/lib/settings/rename-engine/rename-plan";

const before = "Si.eco";
const after = "SI.ECO";

const keyBefore = buildClienteEntityKey(before);
const keyAfter = buildClienteEntityKey(after);

assert.equal(keyBefore, keyAfter, "entity_key must stay stable on display rename");
assert.notEqual(before, after);

const plan = buildRenamePlan({ kind: "cliente", oldLabel: before, newLabel: after });
assert.equal(plan.entityKey, keyBefore);
assert.equal(plan.oldLabel, before);
assert.equal(plan.newLabel, after);

console.log("entity-key-stability.test.ts OK");
