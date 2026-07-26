import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(
  path.join(process.cwd(), "lib/dashboard/refresh-dashboard-queries.ts"),
  "utf8",
);

assert.match(src, /DASHBOARD_REFRESH_TABLES/);
assert.match(src, /lavorazioni/);
assert.match(src, /dashboard_promemoria/);
assert.match(src, /collectQueryKeysForGestionaleTables/);
assert.match(src, /MAGAZZINO_DASHBOARD_KPI_QUERY_KEY/);
assert.doesNotMatch(src, /router\.refresh\(\)/);

console.log("refresh-dashboard-queries.test.ts OK");
