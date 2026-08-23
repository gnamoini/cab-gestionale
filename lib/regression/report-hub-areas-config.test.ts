import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { REPORT_HUB_AREAS } from "@/lib/report/report-hub-areas-config";

const ROOT = process.cwd();

for (const area of REPORT_HUB_AREAS) {
  const routePath = join(ROOT, "app/(gestionale)/report/(areas)", area.id, "page.tsx");
  assert.ok(existsSync(routePath), `missing route for hub area ${area.id}: ${routePath}`);
  assert.match(area.href, /^\/report\//);
  assert.ok(area.testId.length > 0);
}

console.log("report-hub-areas-config.test.ts OK");
