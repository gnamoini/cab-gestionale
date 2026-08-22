import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getReportBusinessLabel,
  getReportSectionCopy,
  isForbiddenPrimaryTitle,
  P10_LABELED_METRIC_IDS,
} from "@/lib/report/ui/report-business-labels";

const ROOT = process.cwd();

for (const id of P10_LABELED_METRIC_IDS) {
  const { title, technicalTerm, tooltip } = getReportBusinessLabel(id);
  assert.equal(isForbiddenPrimaryTitle(title), false, `forbidden primary title for ${id}: ${title}`);
  if (technicalTerm && ["SLA", "WIP", "MTBF", "MTTR", "DSO", "Backlog"].includes(technicalTerm)) {
    assert.equal(
      isForbiddenPrimaryTitle(technicalTerm),
      true,
      `forbidden technicalTerm if used as title: ${technicalTerm}`,
    );
  }
  if (tooltip?.includes("SLA")) {
    assert.equal(isForbiddenPrimaryTitle(tooltip), false, "tooltip may mention SLA");
  }
}

const executiveCopy = getReportSectionCopy("executive");
assert.equal(isForbiddenPrimaryTitle(executiveCopy.title), false);
assert.doesNotMatch(executiveCopy.title, /Executive Overview/i);

const timelineCopy = getReportSectionCopy("timeline");
assert.doesNotMatch(timelineCopy.title, /Operations Timeline/i);

const uiShellFiles = [
  "components/report/bi-center/report-executive-overview.tsx",
  "components/report/bi-center/operational/report-timeline-v2.tsx",
  "components/report/bi-center/report-domain-sections.tsx",
];

const forbiddenPrimaryInTitleProp = [
  /\btitle=["']Executive Overview["']/,
  /\btitle=["']Operations Timeline["']/,
  /\btitle=["']Oltre SLA["']/,
];

for (const rel of uiShellFiles) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  for (const re of forbiddenPrimaryInTitleProp) {
    assert.doesNotMatch(src, re, `${rel} must not use forbidden primary title`);
  }
}

const dtoBuilder = readFileSync(join(ROOT, "lib/report/executive/build-report-executive-dto.ts"), "utf8");
assert.doesNotMatch(dtoBuilder, /getReportBusinessLabel/, "DTO builder must not use presentation labels");

console.log("report-business-language.test.ts OK");
