import assert from "node:assert/strict";
import {
  clearManualAssignSelection,
  completeManualAssignReview,
  describeLavorazioneAssignRowParts,
  filterAttiveForManualAssign,
  manualAssignSelectedId,
  resolveInitialManualAssignState,
  revertManualAssigning,
  selectManualAssignLavorazione,
  startManualAssign,
} from "@/lib/document-capture/capture-manual-assign-state";

assert.deepEqual(resolveInitialManualAssignState(null), { status: "idle" });
assert.deepEqual(resolveInitialManualAssignState("lav-1"), { status: "review", id: "lav-1" });

let state = selectManualAssignLavorazione({ status: "idle" }, "lav-2");
assert.deepEqual(state, { status: "selected", id: "lav-2" });
assert.equal(manualAssignSelectedId(state), "lav-2");

state = selectManualAssignLavorazione(state, "lav-3");
assert.deepEqual(state, { status: "selected", id: "lav-3" });

state = startManualAssign(state, "lav-3");
assert.deepEqual(state, { status: "assigning", id: "lav-3" });

state = revertManualAssigning(state);
assert.deepEqual(state, { status: "selected", id: "lav-3" });

state = completeManualAssignReview("lav-3");
assert.deepEqual(state, { status: "review", id: "lav-3" });

assert.deepEqual(
  selectManualAssignLavorazione({ status: "review", id: "lav-3" }, "lav-9"),
  { status: "review", id: "lav-3" },
);

assert.deepEqual(clearManualAssignSelection({ status: "selected", id: "lav-1" }), { status: "idle" });
assert.deepEqual(clearManualAssignSelection({ status: "review", id: "lav-1" }), {
  status: "review",
  id: "lav-1",
});

const attive = [{ id: "lav-a" }, { id: "lav-b" }];
const filtered = filterAttiveForManualAssign(attive, "alpha", (id) =>
  id === "lav-a" ? "Alpha cliente" : "Beta cliente",
);
assert.equal(filtered.length, 1);
assert.equal(filtered[0]!.id, "lav-a");

const stillVisible = filterAttiveForManualAssign(attive, "beta", (id) =>
  id === "lav-a" ? "Alpha cliente" : "Beta cliente",
);
assert.equal(stillVisible.length, 1);
assert.equal(stillVisible[0]!.id, "lav-b");

const parts = describeLavorazioneAssignRowParts(
  "lav-1",
  [
    {
      id: "lav-1",
      codice: "26-0239",
      cliente: "SI.ECO",
      cantiere: "Tecno Industrie Urbis",
      macchina: "CAT 320",
      nScuderia: "TIS272312/14",
      targa: "ZA065YX",
      matricola: "M-001",
    },
  ],
  {
    "lav-1": {
      ingresso: {
        campi: {
          cliente: "SI.ECO",
          cantiere: "Tecno Industrie Urbis",
          marcaAttrezzatura: "CAT",
          modelloAttrezzatura: "320",
          nScuderia: "TIS272312/14",
          targa: "ZA065YX",
          matricola: "M-001",
        },
      },
    },
  } as never,
);
assert.equal(parts.codice, "26-0239");
assert.equal(parts.headlineLine, "SI.ECO · Tecno Industrie Urbis · CAT 320");
assert.equal(parts.identLine, "TIS272312/14 · ZA065YX · M-001");
assert.doesNotMatch(parts.headlineLine, /—/);
assert.doesNotMatch(parts.identLine, /—/);

console.log("capture-manual-assign-state.test.ts OK");
