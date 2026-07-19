import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DEPRECATED_FALLBACK_REGISTRY } from "@/lib/observability/deprecated-fallback-registry";
import { LEGACY_SYSTEM_REGISTRY } from "@/lib/observability/legacy-system-registry";
import { computeDebtScore } from "../../scripts/audit-technical-debt-score";

const ROOT = process.cwd();

for (const fb of DEPRECATED_FALLBACK_REGISTRY) {
  assert.ok(fb.name.length > 0, "fallback name");
  assert.ok(fb.owner.length > 0, `fallback owner: ${fb.name}`);
  assert.ok(fb.removalCondition.length > 0, `fallback removalCondition: ${fb.name}`);
  assert.ok(fb.telemetryRequired, `fallback telemetryRequired: ${fb.name}`);
}

for (const sys of LEGACY_SYSTEM_REGISTRY) {
  assert.ok(sys.owner.length > 0, `legacy owner: ${sys.name}`);
  assert.ok(sys.replacement.length > 0, `legacy replacement: ${sys.name}`);
  assert.ok(sys.rollbackPlan.length > 0, `legacy rollbackPlan: ${sys.name}`);
  assert.equal(sys.bucket, 3);
}

const score = computeDebtScore();
assert.ok(score.files > 0, "file count");
assert.ok(score.score > 0, "debt score");
assert.equal(score.fallbackPaths, DEPRECATED_FALLBACK_REGISTRY.length);

const phase9Artifacts = [
  "artifacts/audit/dead-code-baseline/orphan-hotspots.json",
  "artifacts/audit/dead-code-baseline/barrel-entropy.json",
  "artifacts/audit/dead-code-baseline/debt-score-trend.json",
  "artifacts/audit/rbac-rca/root-cause.md",
  "docs/migrations/sunset/README.md",
];
for (const rel of phase9Artifacts) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `Phase 9 artifact: ${rel}`);
}

console.log("dead-code-audit-policy.test.ts OK", { score: score.score });
