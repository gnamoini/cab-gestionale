import assert from "node:assert/strict";
import { computeAllPlanStatuses, computePlanStatus } from "@/lib/maintenance-plans/compute-plan-status";

const base = computePlanStatus({
  planId: "p1",
  planNome: "Tagliando 500h",
  intervalOre: 500,
  services: [{ planId: "p1", oreAtService: 2000 }],
  currentOreMezzo: 2340,
});

assert.equal(base.ultimoOre, 2000);
assert.equal(base.prossimoOre, 2500);
assert.equal(base.oreMancanti, 160);

const first = computePlanStatus({
  planId: "p1",
  planNome: "Tagliando 500h",
  intervalOre: 500,
  services: [],
  currentOreMezzo: 100,
});

assert.equal(first.ultimoOre, null);
assert.equal(first.prossimoOre, 500);
assert.equal(first.oreMancanti, 400);

const all = computeAllPlanStatuses({
  plans: [
    { id: "p1", nome: "A", intervalOre: 500 },
    { id: "p2", nome: "B", intervalOre: 1000 },
  ],
  services: [{ planId: "p1", oreAtService: 1500 }],
  currentOreMezzo: 1600,
});

assert.equal(all.length, 2);
assert.equal(all[0]!.prossimoOre, 2000);
assert.equal(all[1]!.prossimoOre, 1000);

console.log("compute-plan-status.test.ts OK");
