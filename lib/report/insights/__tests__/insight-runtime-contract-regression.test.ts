import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildReportInsightsDto } from "@/lib/report/insights/builders/build-report-insights-dto";
import {
  insightFixtureBundle,
  insightFixtureCross,
} from "@/lib/report/insights/__tests__/insight-test-fixtures";

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "test-results/report-v2-insight-runtime-regression.json",
);

const bundle = insightFixtureBundle();
const cross = insightFixtureCross();
const { dto } = buildReportInsightsDto({ bundle, cross });

const firedRuleKeys = dto.insights.map((i) => i.ruleKey);
const serialized = `${JSON.stringify(firedRuleKeys, null, 2)}\n`;

if (!fs.existsSync(path.dirname(SNAPSHOT_PATH))) {
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
}

if (!fs.existsSync(SNAPSHOT_PATH)) {
  fs.writeFileSync(SNAPSHOT_PATH, serialized, "utf8");
  console.log("insight-runtime-contract-regression.test.ts wrote initial snapshot");
} else {
  const expected = fs.readFileSync(SNAPSHOT_PATH, "utf8");
  assert.equal(serialized, expected, "insight runtime regression mismatch");
}

console.log("insight-runtime-contract-regression.test.ts OK");
