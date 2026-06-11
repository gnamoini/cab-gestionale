/**
 * Human-gated promotion review workflow for selector v5/v5.2 proposals.
 *
 * Usage:
 *   npx tsx scripts/selector-review-proposals.ts
 *   npx tsx scripts/selector-review-proposals.ts --approve prop-addetti-1 --note "LGTM"
 *   npx tsx scripts/selector-review-proposals.ts --reject prop-addetti-1
 *   npx tsx scripts/selector-review-proposals.ts --rollback 2
 */
import fs from "node:fs";
import path from "node:path";
import type { SelectorAbSimulationOutcome, SelectorConfigProposal } from "@/lib/selector-core/types";
import { validateSnapshotConsistency } from "@/lib/selector-core/selector-config-enforcer";
import {
  approveProposal,
  DEFAULT_PROMOTION_REGISTRY_PATH,
  getActiveRegistryState,
  loadPromotionRegistry,
  rejectProposal,
  rollbackToVersion,
  savePromotionRegistry,
} from "@/lib/selector-core/selector-config-promotion-registry";
import {
  buildAndPublishSnapshot,
  readManifest,
  readPointer,
} from "@/lib/selector-core/selector-snapshot-registry";

const V5_DIR = path.join(process.cwd(), "docs", "selector", "v5");
const PROPOSALS_PATH = path.join(V5_DIR, "proposals.json");
const SIMULATION_PATH = path.join(V5_DIR, "simulation-results.json");
const REVIEW_PATH = path.join(V5_DIR, "review-report.md");
const REGISTRY_PATH = DEFAULT_PROMOTION_REGISTRY_PATH;

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function formatProposal(proposal: SelectorConfigProposal): string {
  const change = proposal.proposedChange;
  const rawLine =
    proposal.rawConfidence !== undefined
      ? `- **Raw confidence:** ${proposal.rawConfidence.toFixed(2)} (adjusted: ${proposal.confidence.toFixed(2)})`
      : `- **Confidence:** ${proposal.confidence.toFixed(2)}`;
  const lines = [
    `### ${proposal.id} (${proposal.targetDomain})`,
    "",
    `- **Status:** ${proposal.status}`,
    rawLine,
    `- **Sample size:** ${proposal.sampleSize}`,
    `- **Risk:** ${proposal.riskAssessment.riskLevel} — ${proposal.riskAssessment.reasons.join("; ")}`,
    "",
    "**Current vs proposed:**",
    "",
    "```json",
    JSON.stringify(
      {
        currentPreferred: proposal.evidence.metricsSummary,
        proposedChange: change,
      },
      null,
      2,
    ),
    "```",
    "",
    "**Supporting insights:**",
    ...proposal.evidence.supportingInsights.map((r) => `- ${r}`),
    "",
  ];
  return lines.join("\n");
}

function formatSimulation(sim: SelectorAbSimulationOutcome | undefined): string {
  if (!sim) return "_No simulation data available._\n";
  const varianceLine = sim.varianceVsReal
    ? `- Variance vs real: bucketDrift=${sim.varianceVsReal.bucketDrift.toFixed(3)}, mobileShareDrift=${sim.varianceVsReal.mobileShareDrift.toFixed(3)}`
    : "";
  return [
    `- Simulation recommendation: **${sim.recommendation}**`,
    `- Search efficiency: ${sim.current.searchEfficiency.toFixed(3)} → ${sim.proposed.searchEfficiency.toFixed(3)}`,
    `- Fallback reduction potential: ${(sim.fallbackReductionPotential * 100).toFixed(1)}%`,
    varianceLine,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildReviewReport(
  proposals: SelectorConfigProposal[],
  simulations: SelectorAbSimulationOutcome[],
  consistencyNote: string,
  manifestNote: string,
): string {
  const simById = new Map(simulations.map((s) => [s.proposalId, s]));
  const sections = proposals.map((p) => {
    const sim = simById.get(p.id);
    return `${formatProposal(p)}**Offline A/B simulation (estimated):**\n\n${formatSimulation(sim)}`;
  });

  return [
    "# Selector v5 Promotion Review Report",
    "",
    `_Generated at ${new Date().toISOString()}_`,
    "",
    "> Offline intelligence proposes; humans approve. Approved changes publish immutable snapshots (v5.3 pointer model).",
    "",
    "## Config governance (v5.3)",
    "",
    manifestNote,
    consistencyNote,
    "",
    "Rollback = activate prior snapshot version + rebuild/deploy. No engine TS mutation.",
    "",
    "## Proposals",
    "",
    sections.length > 0 ? sections.join("\n---\n\n") : "_No proposals pending._",
    "",
  ].join("\n");
}

function parseFlag(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

function publishSnapshotAfterRegistryChange(): void {
  const snapshot = buildAndPublishSnapshot(getActiveRegistryState());
  console.log(
    `snapshot published: version=${snapshot.version}, applied=[${snapshot.provenance.appliedProposals.join(", ")}]`,
  );
}

function main(): void {
  loadPromotionRegistry(REGISTRY_PATH);

  const approveId = parseFlag(process.argv, "--approve");
  const rejectId = parseFlag(process.argv, "--reject");
  const rollbackVersion = parseFlag(process.argv, "--rollback");
  const note = parseFlag(process.argv, "--note");

  if (approveId) {
    approveProposal(approveId, "human", note);
    savePromotionRegistry(getActiveRegistryState(), REGISTRY_PATH);
    publishSnapshotAfterRegistryChange();
    console.log(`approved: ${approveId}`);
  }

  if (rejectId) {
    rejectProposal(rejectId, "human", note);
    savePromotionRegistry(getActiveRegistryState(), REGISTRY_PATH);
    console.log(`rejected: ${rejectId}`);
  }

  if (rollbackVersion) {
    const version = Number(rollbackVersion);
    rollbackToVersion(version);
    savePromotionRegistry(getActiveRegistryState(), REGISTRY_PATH);
    publishSnapshotAfterRegistryChange();
    console.log(`rolled back registry to version ${version}`);
  }

  const manifest = readManifest();
  const pointer = readPointer();
  const manifestNote = `**Active snapshot:** \`${manifest.activeVersion}\` (pointer: ${pointer.activeVersion}, status: ${pointer.status})`;

  const consistency = validateSnapshotConsistency();
  const consistencyNote = consistency.consistent
    ? "**Snapshot consistency:** OK — active artifact matches registry-derived snapshot."
    : `**Snapshot consistency:** MISMATCH — ${consistency.diff.join("; ")}`;

  const proposals = fs.existsSync(PROPOSALS_PATH)
    ? readJson<SelectorConfigProposal[]>(PROPOSALS_PATH)
    : getActiveRegistryState().proposals;

  const simulations = fs.existsSync(SIMULATION_PATH)
    ? readJson<SelectorAbSimulationOutcome[]>(SIMULATION_PATH)
    : [];

  const report = buildReviewReport(proposals, simulations, consistencyNote, manifestNote);
  fs.mkdirSync(V5_DIR, { recursive: true });
  fs.writeFileSync(REVIEW_PATH, report, "utf8");
  console.log(`review report written: ${REVIEW_PATH}`);
}

main();
