import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildInsightCatalogSnapshotRules } from "@/lib/report/insights/catalog/insight-rule-catalog-hash";
import { INSIGHT_RULE_REGISTRY } from "@/lib/report/insights/registry/insight-rule-registry";
import { INSIGHT_P0_RULE_COUNT } from "@/lib/report/insights/types";

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "test-results/report-v2-insight-rule-catalog-snapshot.json",
);

const snapshot = {
  catalogVersion: 1,
  ruleCount: INSIGHT_P0_RULE_COUNT,
  rules: buildInsightCatalogSnapshotRules(INSIGHT_RULE_REGISTRY),
};

assert.equal(snapshot.rules.length, INSIGHT_RULE_REGISTRY.length);
assert.equal(snapshot.ruleCount, INSIGHT_P0_RULE_COUNT);

const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

if (!fs.existsSync(path.dirname(SNAPSHOT_PATH))) {
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
}

if (!fs.existsSync(SNAPSHOT_PATH)) {
  fs.writeFileSync(SNAPSHOT_PATH, serialized, "utf8");
  console.log("insight-rule-catalog-snapshot.test.ts wrote initial snapshot");
} else {
  const expected = fs.readFileSync(SNAPSHOT_PATH, "utf8");
  assert.equal(serialized, expected, "insight rule catalog snapshot mismatch");
}

console.log("insight-rule-catalog-snapshot.test.ts OK");
