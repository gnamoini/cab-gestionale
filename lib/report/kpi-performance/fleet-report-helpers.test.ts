import assert from "node:assert/strict";
import {
  buildParetoClientiPoints,
  clienteInterventiPct,
  computeFleetDisponibilitaPct,
  topClienteConcentrazionePct,
} from "@/lib/report/kpi-performance/fleet-report-helpers";

assert.equal(computeFleetDisponibilitaPct(10, 2), 80);
assert.equal(computeFleetDisponibilitaPct(0, 0), null);

const pareto = buildParetoClientiPoints([
  { rank: 1, cliente: "A", interventi: 80, ultimoIso: null },
  { rank: 2, cliente: "B", interventi: 20, ultimoIso: null },
]);
assert.equal(pareto.length, 2);
assert.equal(pareto[0]!.cumulPct, 80);

assert.deepEqual(topClienteConcentrazionePct([{ rank: 1, cliente: "X", interventi: 40, ultimoIso: null }]), {
  cliente: "X",
  pct: 100,
});

assert.equal(clienteInterventiPct(25, 100), 25);

console.log("fleet-report-helpers.test.ts OK");
