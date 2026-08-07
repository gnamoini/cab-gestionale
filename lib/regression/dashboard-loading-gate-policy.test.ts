/**
 * Policy — control tower loading gates are decoupled per widget domain.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const metrics = fs.readFileSync(
  path.join(process.cwd(), "src/hooks/view/use-control-tower-metrics.ts"),
  "utf8",
);
const layout = fs.readFileSync(
  path.join(process.cwd(), "components/dashboard/dashboard-control-tower-layout.tsx"),
  "utf8",
);

assert.match(metrics, /const coreLoading = rbacLoading \|\| dash\.isLoading/);
assert.match(metrics, /const headerLoading =/);
assert.match(metrics, /const activityLoading = activityEnabled && activityFeedQ\.isLoading/);
assert.match(metrics, /const timesheetLoading = needTimesheet && timesheetQ\.isPending/);
assert.match(metrics, /const movimentiLoading = needMovimenti && movimentiQ\.isLoading/);
assert.doesNotMatch(metrics, /activityEnabled && activityFeedQ\.isLoading\);?\s*\n\s*const activityFeedLoading/);

assert.match(layout, /widgetShowsSkeleton/);
assert.match(layout, /case "recent-activity":/);
assert.match(layout, /return loading\.activityLoading/);

console.log("dashboard-loading-gate-policy.test.ts OK");
