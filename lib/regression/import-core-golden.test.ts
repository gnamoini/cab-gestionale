import assert from "node:assert/strict";
import { validateOrdineFornitoreBusiness } from "@/lib/import-core/business-validators/ordine-fornitore-validator";
import { validateListinoRowBusiness } from "@/lib/import-core/business-validators/listino-validator";
import { createImportCorrelationId, formatImportCorrelationDisplay } from "@/lib/import-core/correlation-id";
import { getImportErrorDefinition } from "@/lib/import-core/import-error-catalog";

// Golden contract: ordine con prezzo negativo → blocking
const ordineBlocked = validateOrdineFornitoreBusiness({
  righe: [{ codice: "X", descrizione: "Test", quantita: 1, prezzo: -1 }],
  fornitoreTrovato: true,
});
assert.equal(ordineBlocked.status, "blocked");

// Golden contract: listino riga valida
const listinoOk = validateListinoRowBusiness({
  codice: "ABC",
  descrizione: "Filtro",
  costo: 12.5,
  categoria: "Generale",
});
assert.equal(listinoOk.status, "ok");

// Correlation display format
const id = createImportCorrelationId();
assert.match(formatImportCorrelationDisplay(id), /^IMP-\d{8}-[0-9A-F]{5}$/);

// Error catalog coverage
assert.equal(getImportErrorDefinition("AI_TIMEOUT").retryable, true);
assert.equal(getImportErrorDefinition("DUPLICATE_IMPORT").retryable, false);

console.log("import-core-golden.test.ts OK");
