import assert from "node:assert/strict";
import {
  FORBIDDEN_PRIMARY_TITLE_PATTERNS,
  getReportBusinessLabel,
  HISTORICAL_DEFAULT_METRIC_IDS,
  isForbiddenPrimaryTitle,
  P10_LABELED_METRIC_IDS,
} from "@/lib/report/ui/report-business-labels";

for (const id of P10_LABELED_METRIC_IDS) {
  const label = getReportBusinessLabel(id);
  assert.ok(label.title.trim(), `${id} must have business title`);
  assert.equal(
    isForbiddenPrimaryTitle(label.title),
    false,
    `${id} title must not be bare technical: "${label.title}"`,
  );
}

assert.match(getReportBusinessLabel("lav_late_sla").title, /termine previsto/i);
assert.equal(getReportBusinessLabel("lav_late_sla").technicalTerm, "SLA");
assert.match(getReportBusinessLabel("eco_margine_operativo_stimato").title, /Guadagno operativo/i);

for (const id of HISTORICAL_DEFAULT_METRIC_IDS) {
  assert.ok(getReportBusinessLabel(id).title.length > 3, `historical default ${id}`);
}

assert.equal(isForbiddenPrimaryTitle("Lavorazioni oltre il termine previsto"), false);
assert.equal(isForbiddenPrimaryTitle("Oltre SLA"), true);
assert.equal(isForbiddenPrimaryTitle("SLA"), true);

for (const re of FORBIDDEN_PRIMARY_TITLE_PATTERNS) {
  assert.ok(re instanceof RegExp);
}

console.log("report-business-labels.test.ts OK");
