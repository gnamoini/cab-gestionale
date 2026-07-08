import assert from "node:assert/strict";
import {
  logisticaAltroCustomText,
  logisticaSelectBindingValue,
  logisticaShowsAltroInput,
} from "@/lib/ordini-fornitori/ordine-fornitore-logistica-ui";
import { ORDINE_FORNITORE_VETTORE_VALUES } from "@/lib/ordini-fornitori/ordine-fornitore-logistica-options";

assert.equal(logisticaSelectBindingValue(ORDINE_FORNITORE_VETTORE_VALUES, "sda"), "sda");
assert.equal(logisticaSelectBindingValue(ORDINE_FORNITORE_VETTORE_VALUES, "altro"), "altro");
assert.equal(logisticaSelectBindingValue(ORDINE_FORNITORE_VETTORE_VALUES, "Corriere locale"), "altro");
assert.equal(logisticaAltroCustomText(ORDINE_FORNITORE_VETTORE_VALUES, "Corriere locale"), "Corriere locale");
assert.equal(logisticaShowsAltroInput(ORDINE_FORNITORE_VETTORE_VALUES, "altro"), true);
assert.equal(logisticaShowsAltroInput(ORDINE_FORNITORE_VETTORE_VALUES, "tnt"), false);

console.log("ordine-fornitore-logistica-ui.test.ts OK");
