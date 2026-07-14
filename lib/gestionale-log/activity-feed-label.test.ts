import assert from "node:assert/strict";
import {
  activityFeedEventLabel,
  activityFeedEventLabelFromGroup,
  activityFeedMetaLine,
} from "@/lib/gestionale-log/view-model";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";

function vm(partial: Partial<GestionaleLogViewModel>): GestionaleLogViewModel {
  return {
    tone: "update",
    tipoRiga: "AGGIORNAMENTO LAVORAZIONE",
    oggettoRiga: "Cliente · Mezzo",
    modificaRiga: "Data uscita impostato a \"2026-07-02\"",
    autore: "Vito",
    atIso: "2026-07-02T16:59:00.000Z",
    ...partial,
  };
}

assert.equal(activityFeedEventLabel(vm({})), "Lavorazione aggiornata");
assert.equal(activityFeedEventLabel(vm({ tone: "complete" })), "Completata");
assert.equal(activityFeedEventLabel(vm({ tone: "create", tipoRiga: "CREAZIONE LAVORAZIONE" })), "Ingresso");
assert.equal(activityFeedEventLabel(vm({ tone: "create", tipoRiga: "CREAZIONE RICAMBIO" })), "Ricambio inserito");

assert.equal(
  activityFeedEventLabelFromGroup(vm({}), [
    { entita: "lavorazioni", azione: "UPDATE", payload: null },
    { entita: "lavorazioni", azione: "COMPLETE", payload: null },
  ]),
  "Completata",
);

assert.equal(
  activityFeedEventLabelFromGroup(vm({ tone: "update" }), [
    { entita: "lavorazioni", azione: "CREATE", payload: null },
  ]),
  "Ingresso",
);

assert.match(activityFeedMetaLine(vm({}), 3), /Vito · 3 eventi ·/);
assert.match(activityFeedMetaLine(vm({ autore: "Mario" }), 1), /Mario ·/);

console.log("activity-feed-label.test.ts OK");
