import assert from "node:assert/strict";
import { test } from "node:test";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { applyMagazzinoToPreventivoRigaRicambio } from "@/lib/preventivi/preventivo-ricambio-magazzino";
import type { PreventivoRigaRicambio } from "@/lib/preventivi/types";

const baseRow: PreventivoRigaRicambio = {
  id: "prr-1",
  ricambioId: null,
  codiceOE: "",
  descrizione: "",
  quantita: 1,
  prezzoUnitario: 0,
  scontoPercent: 0,
};

const magItem = {
  id: "mag-1",
  codiceFornitoreOriginale: "ABC-123",
  descrizione: "Filtro olio",
  prezzoVendita: 42.5,
  unitaMisura: "pz",
} as RicambioMagazzino;

test("applyMagazzinoToPreventivoRigaRicambio compila codice, descrizione, prezzo e sconto", () => {
  const next = applyMagazzinoToPreventivoRigaRicambio(baseRow, magItem, 12);
  assert.equal(next.ricambioId, "mag-1");
  assert.equal(next.codiceOE, "ABC-123");
  assert.equal(next.descrizione, "Filtro olio");
  assert.equal(next.prezzoUnitario, 42.5);
  assert.equal(next.scontoPercent, 12);
  assert.equal(next.unitaMisura, "pz");
});
