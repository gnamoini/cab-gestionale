/**
 * Import execution routes must call assertImportFileProcessAccess.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const routes = [
  "app/api/import/executions/[id]/route.ts",
  "app/api/import/executions/[id]/retry/route.ts",
] as const;

for (const rel of routes) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.match(src, /assertImportFileProcessAccess\(/, `${rel} must call assertImportFileProcessAccess`);
}

console.log("security-import-retry-owner.test: OK");
