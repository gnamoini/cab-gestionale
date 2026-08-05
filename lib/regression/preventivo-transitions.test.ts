import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canTransitionPreventivoWorkflow,
  PREVENTIVO_WORKFLOW_STATI,
  preventivoWorkflowTransitionTargets,
} from "@/lib/preventivi/preventivo-transitions";
import { isPreventivoVisibleToClient } from "@/lib/preventivi/preventivo-client-visibility";

assert.equal(canTransitionPreventivoWorkflow("bozza", "inviato"), true);
assert.equal(canTransitionPreventivoWorkflow("inviato", "bozza"), true);
assert.equal(canTransitionPreventivoWorkflow("inviato", "acquisito"), false);
assert.equal(canTransitionPreventivoWorkflow("inviato", "inviato"), false);
assert.deepEqual(preventivoWorkflowTransitionTargets("inviato"), ["bozza", "annullato"]);
assert.deepEqual(PREVENTIVO_WORKFLOW_STATI, ["bozza", "inviato", "acquisito", "annullato"]);

assert.equal(isPreventivoVisibleToClient("inviato", "pending", "2026-01-01"), true);
assert.equal(isPreventivoVisibleToClient("acquisito", "accettato", "2026-01-01"), true);
assert.equal(isPreventivoVisibleToClient("bozza", null, null), false);

const statusCell = readFileSync("components/preventivi/preventivo-status-cell.tsx", "utf8");
assert.match(statusCell, /GlobalFixedListPillSelect/);
assert.match(statusCell, /PREVENTIVO_STATO_EDITOR_ITEMS/);

console.log("preventivo-transitions.test.ts OK");
