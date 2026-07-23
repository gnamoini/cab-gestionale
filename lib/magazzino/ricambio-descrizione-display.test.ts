import assert from "node:assert/strict";
import { formatRicambioDescrizioneForUi } from "@/lib/magazzino/ricambio-descrizione-display";

assert.equal(formatRicambioDescrizioneForUi("PORTAFUSIBILE MAXI"), "Portafusibile Maxi");
assert.equal(formatRicambioDescrizioneForUi("Filtro olio"), "Filtro olio");
assert.equal(formatRicambioDescrizioneForUi(""), "");

console.log("ricambio-descrizione-display.test.ts OK");
