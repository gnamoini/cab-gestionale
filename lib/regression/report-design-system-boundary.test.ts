import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  REPORT_SECTION_COMPOSITION_ALLOWLIST,
  REPORT_SECTION_FORBIDDEN_IMPORTS,
  REPORT_SECTION_FORBIDDEN_IMPORT_PATHS,
} from "@/components/report/design-system/contracts/section-composition-allowlist";
import { collectImportedBindingNames, extractImportsFromSource } from "@/lib/regression/report-ds-ast-utils";

const ROOT = process.cwd();
const SECTIONS_DIR = path.join(ROOT, "components/report/sections");

for (const file of fs.readdirSync(SECTIONS_DIR)) {
  if (!file.endsWith(".tsx")) continue;
  const rel = `components/report/sections/${file}`;
  const content = fs.readFileSync(path.join(SECTIONS_DIR, file), "utf8");
  const imports = extractImportsFromSource(content);

  for (const imp of imports) {
    for (const forbidden of REPORT_SECTION_FORBIDDEN_IMPORT_PATHS) {
      assert.doesNotMatch(
        imp,
        new RegExp(forbidden.replace(/\//g, "\\/")),
        `${rel}: import vietato ${imp}`,
      );
    }
  }

  const dsImports = collectImportedBindingNames(content, /@\/components\/report\/design-system/);
  for (const name of dsImports) {
    assert.ok(
      (REPORT_SECTION_COMPOSITION_ALLOWLIST as readonly string[]).includes(name) ||
        name === "ReportDensityProvider",
      `${rel}: ${name} non in composition allowlist`,
    );
    assert.ok(
      !(REPORT_SECTION_FORBIDDEN_IMPORTS as readonly string[]).includes(name),
      `${rel}: import vietato ${name}`,
    );
  }
}

console.log("report-design-system-boundary.test.ts OK");
