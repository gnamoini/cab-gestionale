import assert from "node:assert/strict";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import { pickMezzoPermanentFields } from "@/lib/schede/scheda-ingresso-field-roles";
import {
  createLinkedMezzoSnapshotFromFields,
  emptySchedaIngressoMezzoLinkState,
  listLinkedMezzoFieldConflicts,
  resolvePreferredMezzoIdForSave,
} from "@/lib/schede/scheda-ingresso-mezzo-link-state";
import type { MezzoGestito } from "@/lib/mezzi/types";

const mezzo = {
  id: "m1",
  marca: "Tecno Industrie",
  modello: "Urbis",
  matricola: "TIS272312/14",
  targa: "ZA056YX",
  cliente: "Longo",
} as MezzoGestito;

const fromMezzo = buildSchedaIngressoFieldsFromMezzo(mezzo);
const snapshot = createLinkedMezzoSnapshotFromFields(
  mezzo,
  pickMezzoPermanentFields(fromMezzo),
  "matricola",
);
assert.deepEqual(listLinkedMezzoFieldConflicts(fromMezzo, snapshot), []);

fromMezzo.matricola = "ALTRO";
assert.deepEqual(listLinkedMezzoFieldConflicts(fromMezzo, snapshot), ["matricola"]);

assert.equal(resolvePreferredMezzoIdForSave(emptySchedaIngressoMezzoLinkState()), null);

const linked = {
  ...emptySchedaIngressoMezzoLinkState(),
  status: "linked" as const,
  linkedSnapshot: {
    id: "m1",
    fieldsAtLinkTime: { cliente: "X" } as never,
    linkedAt: "2026-01-01",
    linkedViaField: "matricola" as const,
    mezzoUpdatedAtAtLinkTime: "2026-01-01",
  },
};
assert.equal(resolvePreferredMezzoIdForSave(linked), "m1");

const unconfirmed = {
  ...emptySchedaIngressoMezzoLinkState(),
  status: "unconfirmed_match" as const,
  pendingMezzo: null,
};
assert.equal(resolvePreferredMezzoIdForSave(unconfirmed), null);

console.log("scheda-ingresso-mezzo-link-state.test.ts: ok");
