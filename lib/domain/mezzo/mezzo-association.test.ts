import assert from "node:assert/strict";
import {
  associationTimelineTitle,
  checkAssociationChange,
  isMezzoAssociationField,
  mezzoUpdateTouchesAssociationFields,
  normalizeAssociationValue,
} from "@/lib/domain/mezzo/mezzo-association";
import type { MezzoGestito } from "@/lib/mezzi/types";

function mezzo(partial: Partial<MezzoGestito> & { id: string; cliente: string }): MezzoGestito {
  return {
    marca: "Marca",
    modello: "Modello",
    matricola: "M1",
    targa: "AB123CD",
    utilizzatore: "Mario",
    cantiere: "Nord",
    ...partial,
  } as MezzoGestito;
}

// creazione: mai requiresConfirmation
{
  const r = checkAssociationChange({
    existingMezzo: null,
    incoming: { cliente: "Nuovo", cantiere: "", utilizzatore: "" },
  });
  assert.equal(r.requiresConfirmation, false);
}

// cambio solo cliente
{
  const r = checkAssociationChange({
    existingMezzo: mezzo({ id: "1", cliente: "Cliente A" }),
    incoming: { cliente: "Cliente B", cantiere: "Nord", utilizzatore: "Mario" },
  });
  assert.equal(r.requiresConfirmation, true);
  assert.deepEqual(r.changedFields, ["cliente"]);
}

// normalizzazione case/spazi
{
  const r = checkAssociationChange({
    existingMezzo: mezzo({ id: "1", cliente: "Cliente A", cantiere: "Nord" }),
    incoming: { cliente: "  CLIENTE A  ", cantiere: " nord ", utilizzatore: "mario" },
  });
  assert.equal(r.hasChanges, false);
  assert.equal(normalizeAssociationValue("cliente", " Cliente A "), normalizeAssociationValue("cliente", "cliente a"));
}

// null → valorizzato
{
  const r = checkAssociationChange({
    existingMezzo: mezzo({ id: "1", cliente: "A", utilizzatore: "—", cantiere: "" }),
    incoming: { cliente: "A", cantiere: "", utilizzatore: "Luca" },
  });
  assert.ok(r.changedFields.includes("utilizzatore"));
}

// timeline title
assert.equal(associationTimelineTitle(["cliente"]), "Cliente aggiornato");
assert.equal(associationTimelineTitle(["cliente", "cantiere"]), "Associazione mezzo aggiornata");

// guard patch
assert.equal(mezzoUpdateTouchesAssociationFields({ cliente: "X" }), true);
assert.equal(mezzoUpdateTouchesAssociationFields({ targa: "X" }), false);
assert.ok(isMezzoAssociationField("cantiere"));

console.log("mezzo-association.test.ts: OK");
