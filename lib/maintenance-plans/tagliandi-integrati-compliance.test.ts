import assert from "node:assert/strict";
import { buildFullPresetSnapshot } from "@/lib/maintenance-plans/build-full-preset-snapshot";
import { computeTagliandoCompliance } from "@/lib/maintenance-plans/compute-tagliando-compliance";
import { resolveCompliancePct, parseComplianceReview } from "@/lib/maintenance-plans/resolve-compliance-pct";
import type { MaintenanceTask } from "@/lib/maintenance-plans/maintenance-task";

const snapshot = buildFullPresetSnapshot({
  name: "Tagliando 500h",
  versionNumber: 3,
  parts: [
    {
      ricambioId: "r1",
      codice: "OIL",
      descrizione: "Olio",
      quantita: 2,
      isRequired: true,
      replacementCondition: "sempre",
      conditionParams: null,
      sortOrder: 0,
      note: "",
    },
  ],
  checklist: [{ id: "c1", label: "Controllo livello", sortOrder: 0, isRequired: true }],
});

const executed: MaintenanceTask[] = [
  {
    id: "ricambio:r1",
    kind: "ricambio",
    label: "Olio",
    isRequired: true,
    ricambioId: "r1",
    qtyActual: 2,
  },
  {
    id: "checklist:idx-0",
    kind: "checklist",
    label: "Controllo livello",
    isRequired: true,
    checked: false,
  },
];

const result = computeTagliandoCompliance(snapshot, executed);
assert.equal(result.auto, 95);
assert.ok(result.diffs.some((d) => d.status === "unchecked"));

const reviewed = resolveCompliancePct(
  95,
  parseComplianceReview({
    approved: true,
    adjustments: [{ taskId: "checklist:idx-0", reason: "equivalente", note: "ok", delta: 5 }],
  }),
);
assert.equal(reviewed, 100);

// R1 — compliance only from snapshot, not live preset
const staleSnapshot = { ...snapshot, tasks: [] };
const staleResult = computeTagliandoCompliance(staleSnapshot, executed);
assert.equal(staleResult.auto, null);

// R2 — snapshot self-contained
assert.equal(snapshot.versionLabel, "Versione 3");
assert.equal(snapshot.name, "Tagliando 500h");

console.log("tagliandi-integrati-compliance.test.ts OK");
