import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const layout = readFileSync(join(ROOT, "app/(gestionale)/report/layout.tsx"), "utf8");
const hubPage = readFileSync(join(ROOT, "app/(gestionale)/report/page.tsx"), "utf8");
const hubView = readFileSync(join(ROOT, "components/report/report-hub-view.tsx"), "utf8");
const miniDash = readFileSync(join(ROOT, "components/report/hub/report-hub-mini-dashboard.tsx"), "utf8");
const workspaceShell = readFileSync(join(ROOT, "components/report/report-workspace-shell.tsx"), "utf8");
const areaDataShell = readFileSync(join(ROOT, "components/report/report-area-data-shell.tsx"), "utf8");

const heavyTokens = [
  "useReportLiveData",
  "buildReportDerivedBundle",
  "ReportAnalyticsProvider",
  "ReportDomainSnapshotProvider",
  "BusinessReportShell",
];

for (const token of heavyTokens) {
  assert.doesNotMatch(layout, new RegExp(token), `report layout must not import ${token}`);
  assert.doesNotMatch(hubPage, new RegExp(token), `report hub page must not import ${token}`);
  assert.doesNotMatch(hubView, new RegExp(token), `report hub view must not import ${token}`);
  assert.doesNotMatch(miniDash, new RegExp(token), `report hub mini dashboard must not import ${token}`);
  assert.doesNotMatch(workspaceShell, new RegExp(token), `workspace shell must not import ${token}`);
}

assert.match(hubView, /report-hub/);
assert.match(hubView, /ReportHubMiniDashboard/);
assert.match(areaDataShell, /useReportLiveData/);
assert.match(areaDataShell, /ReportAnalyticsProvider/);

console.log("report-hub-layout-light.test.ts OK");
