import assert from "node:assert/strict";
import {
  applySourceHierarchyPenalty,
  computeConfidenceScore,
  confidenceBandLabel,
  isStructuredMatchClear,
  scoreToConfidenceBand,
  shouldRunWebSearch,
} from "@/lib/ai/spare-parts/ranking/score";
import { deriveDocumentAiIndexBadges } from "@/lib/documents/document-spare-parts-meta";

const strongCatalog = {
  visualMatch: 0.5,
  vehicleMatch: 0.8,
  catalogMatch: 0.9,
  explodedViewMatch: 0.85,
  partsTableMatch: 0.9,
  oemCodeMatch: 1,
  dimensionMatch: 0,
  priceEvidence: 0,
  webEvidence: 0.9,
  historicalConfirmation: 0,
};

assert.equal(isStructuredMatchClear(strongCatalog), true);
assert.equal(shouldRunWebSearch(strongCatalog), false);

const weak = { ...strongCatalog, catalogMatch: 0.1, explodedViewMatch: 0.1, partsTableMatch: 0.1, vehicleMatch: 0.2 };
assert.equal(shouldRunWebSearch(weak), true);

const penalized = applySourceHierarchyPenalty(strongCatalog, true);
assert.ok(penalized.webEvidence < strongCatalog.webEvidence);

const score = computeConfidenceScore(strongCatalog);
assert.ok(score >= 0.45);
assert.equal(scoreToConfidenceBand(0.8), "high");
assert.equal(confidenceBandLabel("medium"), "Media affidabilità");

const badges = deriveDocumentAiIndexBadges({
  aiEnabled: true,
  status: "indexed",
  understandingStatus: "processing",
  indexQuality: "medium",
  capabilities: { exploded_views: true },
});
assert.equal(badges.fileSearch, "ready");
assert.equal(badges.aiCatalog, "processing");

const disabled = deriveDocumentAiIndexBadges({ aiEnabled: false });
assert.equal(disabled.fileSearch, "disabled");

console.log("spare-parts-policy.test.ts OK");
