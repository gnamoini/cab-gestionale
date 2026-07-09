import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  COVERAGE_MIGRATION_ALLOWLIST,
  REPORT_SECTION_FILE_TO_CONTRACT_KEY,
  REPORT_SECTION_PRIMITIVE_CONTRACT,
} from "@/components/report/design-system/contracts/section-primitive-contract";
import { extractJsxPrimitivesFromSource, hasInlineColumnsProp } from "@/lib/regression/report-ds-ast-utils";

const ROOT = process.cwd();
const SECTIONS_DIR = path.join(ROOT, "components/report/sections");

for (const [file, contractKey] of Object.entries(REPORT_SECTION_FILE_TO_CONTRACT_KEY)) {
  const full = path.join(SECTIONS_DIR, file);
  assert.ok(fs.existsSync(full), `section file missing: ${file}`);
  const content = fs.readFileSync(full, "utf8");
  assert.equal(hasInlineColumnsProp(file, content), false, `${file}: columns inline vietate su ReportDataTable`);

  if ((COVERAGE_MIGRATION_ALLOWLIST as readonly string[]).includes(contractKey)) continue;

  const declared = REPORT_SECTION_PRIMITIVE_CONTRACT[contractKey];
  const actual = extractJsxPrimitivesFromSource(file, content);

  for (const kind of declared) {
    assert.ok(actual.has(kind), `${file}: manca primitive dichiarata ${kind}`);
  }
  for (const kind of actual) {
    if (kind === "status-badge" || kind === "embedded") continue;
    assert.ok(
      (declared as readonly string[]).includes(kind),
      `${file}: primitive non dichiarata ${kind}`,
    );
  }
}

console.log("report-section-primitive-coverage.test.ts OK");
