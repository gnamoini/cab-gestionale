import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canTransitionPreventivoStato,
  PREVENTIVO_TRANSITIONS,
} from "@/lib/preventivi/preventivo-transitions";
import { isPreventivoVisibleToClient } from "@/lib/preventivi/preventivo-client-visibility";

assert.equal(canTransitionPreventivoStato("bozza", "inviato"), true);
assert.equal(canTransitionPreventivoStato("confermato", "bozza"), false);
assert.equal(canTransitionPreventivoStato("inviato", "confermato"), true);
assert.equal(canTransitionPreventivoStato("annullato", "bozza"), true);
assert.equal(canTransitionPreventivoStato("annullato", "inviato"), true);
assert.equal(canTransitionPreventivoStato("annullato", "confermato"), false);
assert.deepEqual([...PREVENTIVO_TRANSITIONS.annullato], ["bozza", "inviato"]);

assert.equal(isPreventivoVisibleToClient("inviato"), true);
assert.equal(isPreventivoVisibleToClient("confermato"), true);
assert.equal(isPreventivoVisibleToClient("bozza"), false);
assert.equal(isPreventivoVisibleToClient("annullato"), false);

const statusCell = readFileSync("components/preventivi/preventivo-status-cell.tsx", "utf8");
assert.doesNotMatch(statusCell, /stato === "annullato"/);
assert.match(statusCell, /GlobalFixedListPillSelect/);

console.log("preventivo-transitions.test.ts OK");
