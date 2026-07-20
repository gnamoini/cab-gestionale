import assert from "node:assert/strict";
import {
  evaluateTagliandoDueForMezzo,
  isMezzoEligibleForTagliandoNotification,
  listNotifyTagliandiMilestonesForRow,
  listOverdueTagliandiMilestonesForRow,
  parseSchedaOreLavoro,
  TAGLIANDI_MATRIX_NO_PLAN_ID,
} from "@/lib/maintenance-plans/tagliando-due-eval";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";

const baseMezzo = {
  id: "m1",
  cliente: "Cliente Test",
  utilizzatore: "—",
  marca: "Marca",
  modello: "Modello",
  targa: "AA001",
  matricola: "M1",
  tipoAttrezzatura: "Escavatore",
  anno: 2020,
  oreKm: 0,
  statoAttuale: "Operativo",
  dataUltimaUscita: "—",
  note: "",
  priorita: "normale",
  tagliandi: true,
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

const catalog = [{ id: "tipo-esc", label: "Escavatore" }];

assert.equal(parseSchedaOreLavoro("600"), 600);
assert.equal(parseSchedaOreLavoro(""), 0);
assert.equal(parseSchedaOreLavoro("abc"), 0);

const overdueNoSvc = listOverdueTagliandiMilestonesForRow({
  mezzoId: "m1",
  planId: "p1",
  intervalOre: 500,
  currentOre: 600,
  services: [],
});
assert.deepEqual(overdueNoSvc, [500]);

const overdueWithSvc500 = listOverdueTagliandiMilestonesForRow({
  mezzoId: "m1",
  planId: "p1",
  intervalOre: 500,
  currentOre: 600,
  services: [{ id: "s1", mezzoId: "m1", planId: "p1", oreAtService: 500 }],
});
assert.deepEqual(overdueWithSvc500, []);

const overdue1000 = listOverdueTagliandiMilestonesForRow({
  mezzoId: "m1",
  planId: "p1",
  intervalOre: 500,
  currentOre: 1100,
  services: [{ id: "s1", mezzoId: "m1", planId: "p1", oreAtService: 500 }],
});
assert.deepEqual(overdue1000, [1000]);

const notifyLead = listNotifyTagliandiMilestonesForRow({
  mezzoId: "m1",
  planId: "p1",
  intervalOre: 500,
  currentOre: 450,
  services: [],
});
assert.deepEqual(notifyLead, [500]);

const notifyBeforeLead = listNotifyTagliandiMilestonesForRow({
  mezzoId: "m1",
  planId: "p1",
  intervalOre: 500,
  currentOre: 449,
  services: [],
});
assert.deepEqual(notifyBeforeLead, []);

const evalOverdue = evaluateTagliandoDueForMezzo({
  mezzo: baseMezzo,
  currentOre: 600,
  plans: [plan],
  catalog,
  services: [],
});
assert.ok(evalOverdue);
assert.equal(evalOverdue!.earliestOverdueOre, 500);
assert.equal(evalOverdue!.overdueCount, 1);

const evalDone500 = evaluateTagliandoDueForMezzo({
  mezzo: baseMezzo,
  currentOre: 600,
  plans: [plan],
  catalog,
  services: [{ id: "s1", mezzoId: "m1", planId: "p1", oreAtService: 500 }],
});
assert.equal(evalDone500, null);

const evalLead450 = evaluateTagliandoDueForMezzo({
  mezzo: baseMezzo,
  currentOre: 450,
  plans: [plan],
  catalog,
  services: [],
});
assert.ok(evalLead450);
assert.equal(evalLead450!.earliestOverdueOre, 500);

assert.equal(
  evaluateTagliandoDueForMezzo({
    mezzo: { ...baseMezzo, tagliandi: false },
    currentOre: 600,
    plans: [plan],
    catalog,
    services: [],
  }),
  null,
);

assert.equal(isMezzoEligibleForTagliandoNotification({ ...baseMezzo, tagliandi: true }), true);
assert.equal(isMezzoEligibleForTagliandoNotification({ ...baseMezzo, tagliandi: false }), false);
assert.equal(isMezzoEligibleForTagliandoNotification(null), false);

assert.equal(
  evaluateTagliandoDueForMezzo({
    mezzo: baseMezzo,
    currentOre: 0,
    plans: [plan],
    catalog,
    services: [],
  }),
  null,
);

const evalNoPlan = evaluateTagliandoDueForMezzo({
  mezzo: { ...baseMezzo, tipoAttrezzatura: "Spazzatrice" },
  currentOre: 600,
  plans: [plan],
  catalog,
  services: [],
});
assert.ok(evalNoPlan);
assert.equal(evalNoPlan!.earliestOverdueOre, 500);

const noPlanOverdue = listOverdueTagliandiMilestonesForRow({
  mezzoId: "m1",
  planId: TAGLIANDI_MATRIX_NO_PLAN_ID,
  intervalOre: 500,
  currentOre: 600,
  services: [],
});
assert.deepEqual(noPlanOverdue, [500]);

console.log("tagliando-due-eval.test.ts OK");
