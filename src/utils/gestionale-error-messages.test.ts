import assert from "node:assert/strict";
import { humanizeGestionaleError } from "@/src/utils/gestionale-error-messages";

assert.equal(
  humanizeGestionaleError("Giacenza insufficiente", { module: "magazzino", action: "update" }),
  "Giacenza insufficiente per il movimento richiesto.",
);

assert.equal(
  humanizeGestionaleError("insufficient privilege", { module: "magazzino", action: "update" }),
  "Accesso negato alla sezione Magazzino.",
);

assert.equal(
  humanizeGestionaleError("Permesso negato", { module: "magazzino", action: "update" }),
  "Accesso negato alla sezione Magazzino.",
);

console.log("gestionale-error-messages.test.ts OK");
