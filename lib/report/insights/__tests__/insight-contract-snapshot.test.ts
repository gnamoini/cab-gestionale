import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildReportInsightsDto } from "@/lib/report/insights/builders/build-report-insights-dto";
import { INSIGHT_CONTRACT_VERSION, type ReportInsightsDto } from "@/lib/report/insights/types";
import {
  insightFixtureBundle,
  insightFixtureCross,
} from "@/lib/report/insights/__tests__/insight-test-fixtures";

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "test-results/report-v2-insight-contract-snapshot.json",
);

function buildContractSnapshot(dto: ReportInsightsDto) {
  return {
    contractVersion: dto.contractVersion,
    insights: dto.insights.map((insight) => ({
      ruleKey: insight.ruleKey,
      ruleVersion: insight.ruleVersion,
      severity: insight.severity,
      metricIds: [...insight.metricIds].sort(),
    })),
    metadata: {
      contractVersion: dto.metadata.contractVersion,
      trustStatus: dto.metadata.trustStatus,
      sourceFreshness: dto.metadata.sourceFreshness,
      generatedAt: "<dynamic>",
    },
  };
}

const bundle = insightFixtureBundle();
const cross = insightFixtureCross();
const { dto } = buildReportInsightsDto({ bundle, cross });
assert.equal(dto.contractVersion, INSIGHT_CONTRACT_VERSION);
assert.ok(dto.insights.some((i) => i.ruleKey === "LAV_OPEN_BACKLOG"));

const snapshot = buildContractSnapshot(dto);
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

if (!fs.existsSync(path.dirname(SNAPSHOT_PATH))) {
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
}

if (!fs.existsSync(SNAPSHOT_PATH)) {
  fs.writeFileSync(SNAPSHOT_PATH, serialized, "utf8");
  console.log("insight-contract-snapshot.test.ts wrote initial snapshot");
} else {
  const expected = fs.readFileSync(SNAPSHOT_PATH, "utf8");
  assert.equal(serialized, expected, "insight contract snapshot mismatch");
}

console.log("insight-contract-snapshot.test.ts OK");
