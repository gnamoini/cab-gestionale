import assert from "node:assert/strict";
import {
  effectiveDocumentoApplicabilita,
  validateDocumentoMarcaModelloFields,
} from "@/lib/documenti/documenti-form-validation";

{
  const v = validateDocumentoMarcaModelloFields("modello", "CAT", "");
  assert.equal(v.valid, false);
  assert.equal(v.modelloInvalid, true);
}

{
  const v = validateDocumentoMarcaModelloFields("modello", "CAT", "320");
  assert.equal(v.valid, true);
}

{
  assert.equal(effectiveDocumentoApplicabilita("listini", "modello"), "marca");
}

console.log("documenti-form-validation.test.ts OK");
