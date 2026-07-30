import assert from "node:assert/strict";
import {
  defaultTargetTypeForProfilo,
  schedaIngressoMezzoSectionOrder,
  showAttrezzaturaSections,
  showInterventoTargetToggle,
  showTelaioSections,
} from "./officina-profilo-operativo";

assert.equal(showTelaioSections("attrezzature"), true);
assert.equal(showTelaioSections("telai"), true);
assert.equal(showTelaioSections("misto"), true);

assert.equal(showAttrezzaturaSections("attrezzature"), true);
assert.equal(showAttrezzaturaSections("telai"), false);
assert.equal(showAttrezzaturaSections("misto"), true);

assert.deepEqual(schedaIngressoMezzoSectionOrder("attrezzature"), ["attrezzatura", "telaio"]);
assert.deepEqual(schedaIngressoMezzoSectionOrder("telai"), ["telaio"]);
assert.deepEqual(schedaIngressoMezzoSectionOrder("misto"), ["telaio", "attrezzatura"]);

assert.equal(showInterventoTargetToggle("attrezzature"), false);
assert.equal(showInterventoTargetToggle("telai"), false);
assert.equal(showInterventoTargetToggle("misto"), true);

assert.equal(defaultTargetTypeForProfilo("telai"), "telaio");
assert.equal(defaultTargetTypeForProfilo("attrezzature"), "attrezzatura");
assert.equal(defaultTargetTypeForProfilo("misto"), "attrezzatura");

console.log("officina-profilo-operativo.test.ts: ok");
