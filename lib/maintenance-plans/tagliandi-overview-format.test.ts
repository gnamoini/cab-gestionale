import assert from "node:assert/strict";
import {
  formatOverviewCurrentValue,
  formatOverviewGiornoPrevisto,
  formatOverviewUltimoData,
  formatOverviewValoreFatto,
  formatOverviewValorePrevisto,
} from "@/lib/maintenance-plans/tagliandi-overview-format";
import type { TagliandiOverviewRow } from "@/lib/maintenance-plans/v2-types";

function base(over: Partial<TagliandiOverviewRow>): TagliandiOverviewRow {
  return {
    configId: "c1",
    mezzoId: "m1",
    presetId: "p1",
    numeroScuderia: null,
    targa: "GF004AT",
    matricola: null,
    cliente: "Cliente Demo",
    cantiere: null,
    utilizzatore: "Raccolgo",
    attrezzaturaLabel: "Tecno Industrie AZIMUT",
    telaioLabel: "Mitsubishi Fuso Canter",
    presetNome: "Tagliando Motore Mitsubishi Fuso Canter",
    intervalType: "km",
    intervalValue: 25000,
    intervalLabel: "25000 km",
    ultimoPerformedAt: "2026-07-21",
    ultimoValueAtService: 75636,
    currentValue: 75636,
    remainingValue: 25000,
    nextDateEstimated: "2027-07-21",
    confidenceLevel: null,
    confidencePct: null,
    confidenceReason: null,
    triggerReason: "mesi",
    explainability: {
      trigger_reason: "mesi",
      due_date: "2027-07-21",
      groups: [
        {
          operator: "OR",
          winningTrigger: "mesi",
          groupDueDate: "2027-07-21",
          groupIsOverdue: false,
          alternatives: [
            { type: "km", due: null, remaining: 25000, isOverdue: false },
            { type: "mesi", due: "2027-07-21", remaining: 365, isOverdue: false },
          ],
        },
      ],
    },
    partsCount: 0,
    urgency: "verde",
    canPlanWorkshop: false,
    dueReasonLabel: "Tagliando Motore Mitsubishi Fuso Canter: scadenza stimata",
    ...over,
  };
}

assert.equal(formatOverviewUltimoData(base({})), "21/07/2026");
assert.equal(formatOverviewValoreFatto(base({})), "75.636 km");
assert.equal(formatOverviewGiornoPrevisto(base({})), "21/07/2027");
assert.equal(formatOverviewValorePrevisto(base({})), "100.636 km");
assert.equal(formatOverviewCurrentValue(base({})), "75.636 km");

assert.equal(formatOverviewValoreFatto(base({ ultimoValueAtService: null })), "—");
assert.equal(formatOverviewGiornoPrevisto(base({ nextDateEstimated: null })), "—");
assert.equal(
  formatOverviewValorePrevisto(
    base({
      explainability: null,
      triggerReason: "km",
      remainingValue: 1200,
    }),
  ),
  "76.836 km",
);

console.log("tagliandi-overview-format.test.ts OK");
