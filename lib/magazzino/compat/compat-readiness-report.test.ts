import assert from "node:assert/strict";
import {
  buildCompatReadinessReport,
  COMPAT_READINESS_SCORE_THRESHOLD,
} from "@/lib/magazzino/compat/compat-readiness-report";

const report = buildCompatReadinessReport(process.cwd());

assert.ok(report.globalScore >= COMPAT_READINESS_SCORE_THRESHOLD, `score too low: ${report.globalScore}`);
assert.equal(report.scan.hits.filter((h) => h.severity === "critical").length, 0);
assert.ok(report.categories.ssotConsistency >= 85);
assert.ok(report.categories.cacheCorrectness >= 85);
assert.ok(["YES", "CONDITIONAL"].includes(report.productionReadiness));

console.log(
  `compat-readiness-report.test.ts OK (score=${report.globalScore}, readiness=${report.productionReadiness})`,
);
