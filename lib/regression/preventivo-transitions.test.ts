import assert from "node:assert/strict";
import {
  canTransitionPreventivoStato,
  PREVENTIVO_TRANSITIONS,
} from "@/lib/preventivi/preventivo-transitions";
import { isPreventivoVisibleToClient } from "@/lib/preventivi/preventivo-client-visibility";

assert.equal(canTransitionPreventivoStato("bozza", "inviato"), true);
assert.equal(canTransitionPreventivoStato("confermato", "bozza"), false);
assert.equal(canTransitionPreventivoStato("inviato", "confermato"), true);
assert.equal(PREVENTIVO_TRANSITIONS.annullato.length, 0);

assert.equal(isPreventivoVisibleToClient("inviato"), true);
assert.equal(isPreventivoVisibleToClient("confermato"), true);
assert.equal(isPreventivoVisibleToClient("bozza"), false);
assert.equal(isPreventivoVisibleToClient("annullato"), false);

console.log("preventivo-transitions.test.ts OK");
