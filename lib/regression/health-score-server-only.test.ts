import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const hook = fs.readFileSync(
  path.join(ROOT, "src/hooks/view/use-operational-health-score.ts"),
  "utf8",
);

assert.doesNotMatch(hook, /computeOperationalHealthScore/, "hook must not compute client-side");
assert.doesNotMatch(hook, /filterControlTowerKpiClusters/, "hook must not RBAC-filter KPIs");
assert.match(hook, /\/api\/dashboard\/health-score/, "hook must fetch v2 API");

const serverService = fs.readFileSync(
  path.join(ROOT, "src/lib/supabase/server-service-client.ts"),
  "utf8",
);
assert.match(serverService, /server-only/, "service client must be server-only");
assert.doesNotMatch(serverService, /"use client"/, "service client must not be client");

const fetchInputs = fs.readFileSync(
  path.join(ROOT, "lib/health-score/repository/fetch-inputs.server.ts"),
  "utf8",
);
assert.match(fetchInputs, /sanitizeStati/, "health score fetch must pass sanitizeStati to lav fetch");
assert.doesNotMatch(
  fetchInputs,
  /fetchLavorazioniListRows\(sb, LAVORAZIONI_REPORT_FILTERS\)\s*,/,
  "lav fetch must not omit sanitizeStati options",
);

console.log("health-score-server-only.test.ts OK");
