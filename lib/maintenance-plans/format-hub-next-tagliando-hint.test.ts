import assert from "node:assert/strict";
import {
  formatHubNextTagliandoHint,
  type HubNextTagliandoHintInput,
} from "./format-hub-next-tagliando-hint.js";

function base(over: Partial<HubNextTagliandoHintInput>): HubNextTagliandoHintInput {
  return {
    explainability: null,
    remainingValue: null,
    nextDateEstimated: null,
    currentValue: 300,
    triggerReason: null,
    urgency: "verde",
    ...over,
  };
}

const orePlanned = formatHubNextTagliandoHint(
  base({
    remainingValue: 200,
    triggerReason: "ore",
    explainability: {
      trigger_reason: "ore",
      due_date: null,
      groups: [
        {
          operator: "OR",
          winningTrigger: "ore",
          groupDueDate: null,
          groupIsOverdue: false,
          alternatives: [{ type: "ore", due: null, remaining: 200, isOverdue: false }],
        },
      ],
    },
  }),
);
assert.match(orePlanned.text, /Prossimo tagliando previsto fra 200 ore/);
assert.equal(orePlanned.tone, "neutral");

const mesiPlanned = formatHubNextTagliandoHint(
  base({
    remainingValue: 120,
    triggerReason: "mesi",
    nextDateEstimated: "2026-11-29",
    explainability: {
      trigger_reason: "mesi",
      due_date: "2026-11-29",
      groups: [
        {
          operator: "OR",
          winningTrigger: "mesi",
          groupDueDate: "2026-11-29",
          groupIsOverdue: false,
          alternatives: [{ type: "mesi", due: "2026-11-29", remaining: 120, isOverdue: false }],
        },
      ],
    },
  }),
);
assert.match(mesiPlanned.text, /Prossimo tagliando previsto fra 4 mesi/);

const comboPlanned = formatHubNextTagliandoHint(
  base({
    remainingValue: 200,
    triggerReason: "ore",
    explainability: {
      trigger_reason: "ore",
      due_date: "2026-11-29",
      groups: [
        {
          operator: "OR",
          winningTrigger: "ore",
          groupDueDate: "2026-11-29",
          groupIsOverdue: false,
          alternatives: [
            { type: "ore", due: null, remaining: 200, isOverdue: false },
            { type: "mesi", due: "2026-11-29", remaining: 120, isOverdue: false },
          ],
        },
      ],
    },
  }),
);
assert.match(comboPlanned.text, /Prossimo tagliando previsto fra 200 ore \/ 4 mesi/);

const kmDatePlanned = formatHubNextTagliandoHint(
  base({
    currentValue: 10000,
    remainingValue: 2500,
    triggerReason: "km",
    nextDateEstimated: "2026-09-30",
    explainability: {
      trigger_reason: "mesi",
      due_date: "2026-09-30",
      groups: [
        {
          operator: "OR",
          winningTrigger: "mesi",
          groupDueDate: "2026-09-30",
          groupIsOverdue: false,
          alternatives: [
            { type: "km", due: null, remaining: 2500, isOverdue: false },
            { type: "mesi", due: "2026-09-30", remaining: 60, isOverdue: false },
          ],
        },
      ],
    },
  }),
);
assert.match(kmDatePlanned.text, /Tagliando previsto a 12\.500 km o entro 30\/09\/2026/);

const oreOverdue = formatHubNextTagliandoHint(
  base({
    currentValue: 550,
    remainingValue: -50,
    triggerReason: "ore",
    urgency: "rosso",
    explainability: {
      trigger_reason: "ore",
      due_date: null,
      groups: [
        {
          operator: "OR",
          winningTrigger: "ore",
          groupDueDate: null,
          groupIsOverdue: true,
          alternatives: [{ type: "ore", due: null, remaining: -50, isOverdue: true }],
        },
      ],
    },
  }),
);
assert.match(oreOverdue.text, /Tagliando scaduto da 50 ore/);
assert.equal(oreOverdue.tone, "danger");

const mesiOverdue = formatHubNextTagliandoHint(
  base({
    remainingValue: -60,
    triggerReason: "mesi",
    urgency: "rosso",
    explainability: {
      trigger_reason: "mesi",
      due_date: "2026-05-01",
      groups: [
        {
          operator: "OR",
          winningTrigger: "mesi",
          groupDueDate: "2026-05-01",
          groupIsOverdue: true,
          alternatives: [{ type: "mesi", due: "2026-05-01", remaining: -60, isOverdue: true }],
        },
      ],
    },
  }),
);
assert.match(mesiOverdue.text, /Tagliando scaduto da 2 mesi/);

const fallback = formatHubNextTagliandoHint(base({}));
assert.equal(fallback.text, "Pianificazione tagliando in corso");

console.log("format-hub-next-tagliando-hint.test.ts OK");
