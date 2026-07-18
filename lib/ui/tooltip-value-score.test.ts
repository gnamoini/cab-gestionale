import assert from "node:assert/strict";
import {
  classifyTooltipVerdict,
  inferDynamicTooltipNecessity,
  tooltipNecessityScore,
  tooltipValueScore,
  resolveTooltipContent,
} from "@/lib/ui/tooltip-value-score";

assert.equal(inferDynamicTooltipNecessity("Notifiche (${unreadCount})", "", { iconOnly: true }).score, 10);
assert.ok(inferDynamicTooltipNecessity("formatTimesheetDayColumnTooltip(d, monthKey)", "").score >= 85);

assert.equal(tooltipValueScore("Salva", "Salva"), 0);
assert.ok(
  tooltipValueScore("Elimina", "Elimina definitivamente il ricambio e tutti i movimenti associati") > 0,
);

const importScore = tooltipValueScore("Importa", "Importa ricambi da documento DDT e avvia il matching automatico");
assert.ok(importScore > 0, `import score ${importScore}`);

const aiScore = tooltipValueScore("AI", "Analisi eseguita con Gemini 2.5 Pro");
assert.ok(aiScore > 0, `ai score ${aiScore}`);

assert.equal(
  classifyTooltipVerdict("Salva", "Salva"),
  "REMOVE_DUPLICATE",
);
assert.equal(
  classifyTooltipVerdict("Importa", "Importa ricambi da documento DDT e avvia il matching automatico"),
  "KEEP_CONTEXTUAL",
);
assert.equal(
  classifyTooltipVerdict("AI", "Analisi eseguita con Gemini 2.5 Pro"),
  "KEEP_INFORMATIONAL",
);
assert.equal(
  classifyTooltipVerdict("", "Salva", { iconOnly: true, ariaLabel: "Salva" }),
  "KEEP_ACCESSIBILITY",
);
assert.ok(tooltipNecessityScore("", "Salva", { iconOnly: true, ariaLabel: "Salva" }) < 25);
assert.ok(tooltipNecessityScore("Importa", "Importa ricambi da documento DDT e avvia il matching automatico") >= 70);
assert.ok(tooltipNecessityScore("Salva", "Salva") < 25);
assert.equal(resolveTooltipContent("", "Salva", { iconOnly: true, ariaLabel: "Salva" }), undefined);
assert.equal(
  resolveTooltipContent("Importa", "Importa ricambi da documento DDT"),
  "Importa ricambi da documento DDT",
);

console.log("lib/ui/tooltip-value-score.test.ts OK");
