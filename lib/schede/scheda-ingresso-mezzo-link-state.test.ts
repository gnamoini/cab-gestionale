import assert from "node:assert/strict";
import {
  emptySchedaIngressoMezzoLinkState,
  resolvePreferredMezzoIdForSave,
} from "@/lib/schede/scheda-ingresso-mezzo-link-state";

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
