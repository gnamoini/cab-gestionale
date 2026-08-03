import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canTransitionPreventivoStato,
  PREVENTIVO_STATI,
  preventivoStatoTransitionTargets,
} from "@/lib/preventivi/preventivo-transitions";
import { isPreventivoVisibleToClient } from "@/lib/preventivi/preventivo-client-visibility";

assert.equal(canTransitionPreventivoStato("bozza", "inviato"), true);
assert.equal(canTransitionPreventivoStato("confermato", "bozza"), true);
assert.equal(canTransitionPreventivoStato("inviato", "confermato"), true);
assert.equal(canTransitionPreventivoStato("annullato", "confermato"), true);
assert.equal(canTransitionPreventivoStato("inviato", "inviato"), false);
assert.deepEqual(preventivoStatoTransitionTargets("inviato"), ["bozza", "confermato", "annullato"]);
assert.deepEqual(PREVENTIVO_STATI, ["bozza", "inviato", "confermato", "annullato"]);

assert.equal(isPreventivoVisibleToClient("inviato"), true);
assert.equal(isPreventivoVisibleToClient("confermato"), true);
assert.equal(isPreventivoVisibleToClient("bozza"), false);
assert.equal(isPreventivoVisibleToClient("annullato"), false);

const statusCell = readFileSync("components/preventivi/preventivo-status-cell.tsx", "utf8");
assert.doesNotMatch(statusCell, /stato === "annullato"/);
assert.match(statusCell, /GlobalFixedListPillSelect/);
assert.match(statusCell, /PREVENTIVO_STATO_EDITOR_ITEMS/);
assert.doesNotMatch(statusCell, /editorItemsForStato/);

console.log("preventivo-transitions.test.ts OK");
