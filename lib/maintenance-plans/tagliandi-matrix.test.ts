import assert from "node:assert/strict";
import {
  buildTagliandiMatrixColumnOres,
  buildTagliandiMatrixRows,
  findServiceAtMilestone,
  isMilestoneApplicable,
  resolveMatrixTogglePlanId,
  TAGLIANDI_MATRIX_NO_PLAN_ID,
  tagliandiMatrixCellState,
} from "@/lib/maintenance-plans/tagliandi-matrix";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";

assert.equal(isMilestoneApplicable(500, 500), true);
assert.equal(isMilestoneApplicable(500, 1000), true);
assert.equal(isMilestoneApplicable(500, 750), false);
assert.equal(isMilestoneApplicable(1000, 500), false);

assert.equal(
  tagliandiMatrixCellState({ milestoneOre: 500, intervalOre: 500, currentOre: 600, done: true }),
  "done",
);
assert.equal(
  tagliandiMatrixCellState({ milestoneOre: 500, intervalOre: 500, currentOre: 600, done: false }),
  "overdue",
);
assert.equal(
  tagliandiMatrixCellState({ milestoneOre: 1000, intervalOre: 500, currentOre: 400, done: false }),
  "pending",
);
assert.equal(
  tagliandiMatrixCellState({ milestoneOre: 750, intervalOre: 500, currentOre: 800, done: false }),
  "na",
);

const hit = findServiceAtMilestone(
  [{ id: "s1", mezzoId: "m1", planId: "p1", oreAtService: 1000 }],
  "m1",
  "p1",
  1000,
);
assert.equal(hit?.id, "s1");

const cols = buildTagliandiMatrixColumnOres({
  rows: [
    {
      mezzoId: "m1",
      mezzoLabel: "A",
      cliente: "C",
      tipoAttrezzatura: "Tipo",
      planId: "p1",
      planNome: "P",
      intervalOre: 500,
      currentOre: 2340,
    },
  ],
  services: [{ id: "s1", mezzoId: "m1", planId: "p1", oreAtService: 2000 }],
});
assert.ok(cols.includes(500));
assert.ok(cols.includes(2500));
assert.equal(cols[0], 500);
assert.equal(cols[1], 1000);

const baseMezzo = {
  id: "m1",
  cliente: "Cliente",
  utilizzatore: "—",
  marca: "Marca",
  modello: "Modello",
  targa: "AA001",
  matricola: "M1",
  tipoAttrezzatura: "Escavatore",
  anno: 2020,
  oreKm: 1200,
  statoAttuale: "Operativo",
  dataUltimaUscita: "—",
  note: "",
  priorita: "normale",
} satisfies MezzoGestito;

const plan: MaintenancePlanView = {
  id: "p1",
  nome: "Tagliando 500h",
  intervalOre: 500,
  isActive: true,
  tipoLabels: ["Escavatore"],
  tipoIds: ["tipo-esc"],
  parts: [],
};

const rowsEnabled = buildTagliandiMatrixRows({
  mezzi: [{ ...baseMezzo, tagliandi: true }],
  plans: [plan],
  catalog: [{ id: "tipo-esc", label: "Escavatore" }],
});
assert.equal(rowsEnabled.length, 1);

const rowsDisabled = buildTagliandiMatrixRows({
  mezzi: [{ ...baseMezzo, tagliandi: false }],
  plans: [plan],
  catalog: [{ id: "tipo-esc", label: "Escavatore" }],
});
assert.equal(rowsDisabled.length, 0);

const rowsNoPlan = buildTagliandiMatrixRows({
  mezzi: [{ ...baseMezzo, tagliandi: true, tipoAttrezzatura: "Spazzatrice" }],
  plans: [plan],
  catalog: [{ id: "tipo-esc", label: "Escavatore" }],
});
assert.equal(rowsNoPlan.length, 1);
assert.equal(rowsNoPlan[0]!.planId, TAGLIANDI_MATRIX_NO_PLAN_ID);
assert.equal(rowsNoPlan[0]!.planNome, "500 h");

const noPlanSvc = findServiceAtMilestone(
  [{ id: "s2", mezzoId: "m1", planId: "p-other", oreAtService: 1000 }],
  "m1",
  TAGLIANDI_MATRIX_NO_PLAN_ID,
  1000,
);
assert.equal(noPlanSvc?.id, "s2");

assert.equal(
  resolveMatrixTogglePlanId({ planId: TAGLIANDI_MATRIX_NO_PLAN_ID }, [{ id: "p1", isActive: true, intervalOre: 500 }]),
  "p1",
);

console.log("tagliandi-matrix.test.ts OK");
