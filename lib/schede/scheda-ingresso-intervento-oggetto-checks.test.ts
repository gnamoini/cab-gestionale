import assert from "node:assert/strict";
import {
  patchInterventoOggettoChecks,
  resolveInterventoOggettoChecks,
  targetTypeFromInterventoOggettoChecks,
} from "@/lib/schede/scheda-ingresso-intervento-oggetto-checks";

assert.deepEqual(resolveInterventoOggettoChecks({}), { suAttrezzatura: true, suTelaio: false });
assert.deepEqual(resolveInterventoOggettoChecks({ targetType: "telaio" }), {
  suAttrezzatura: false,
  suTelaio: true,
});
assert.deepEqual(
  resolveInterventoOggettoChecks({
    interventoSuAttrezzatura: true,
    interventoSuTelaio: true,
  }),
  { suAttrezzatura: true, suTelaio: true },
);

assert.equal(targetTypeFromInterventoOggettoChecks({ suAttrezzatura: false, suTelaio: true }), "telaio");
assert.equal(
  targetTypeFromInterventoOggettoChecks({ suAttrezzatura: true, suTelaio: true }),
  "attrezzatura",
);

const patched = patchInterventoOggettoChecks(
  { suAttrezzatura: true, suTelaio: false },
  { suTelaio: true },
);
assert.equal(patched.interventoSuTelaio, true);
assert.equal(patched.targetType, "attrezzatura");

console.log("scheda-ingresso-intervento-oggetto-checks.test.ts OK");
