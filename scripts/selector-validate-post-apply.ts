/**
 * Post-apply validation — compare AB simulation predictions vs real telemetry.
 *
 * Usage:
 *   npm run selector:promotion:validate
 */
import fs from "node:fs";
import path from "node:path";
import {
  summarizeValidationResults,
  validatePostApplyOutcomes,
} from "@/lib/selector-core/selector-post-apply-validator";
import type {
  SelectorAbSimulationOutcome,
  SelectorConfigProposal,
  SelectorValidationResult,
} from "@/lib/selector-core/types";
import type { SelectorOpenEvent } from "@/lib/selector-core/selector-telemetry";
import {
  DEFAULT_PROMOTION_REGISTRY_PATH,
  getActiveRegistryState,
  loadPromotionRegistry,
} from "@/lib/selector-core/selector-config-promotion-registry";

const V5_DIR = path.join(process.cwd(), "docs", "selector", "v5");
const SIMULATION_PATH = path.join(V5_DIR, "simulation-results.json");
const TELEMETRY_FIXTURE = path.join(process.cwd(), "docs", "selector-telemetry-snapshot.fixture.json");
const VALIDATION_OUTPUT = path.join(V5_DIR, "validation-results.json");

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function main(): void {
  loadPromotionRegistry(DEFAULT_PROMOTION_REGISTRY_PATH);
  const registry = getActiveRegistryState();

  const proposals = registry.proposals;
  const simulations = fs.existsSync(SIMULATION_PATH)
    ? readJson<SelectorAbSimulationOutcome[]>(SIMULATION_PATH)
    : [];

  const telemetryPath = process.argv[2] ?? TELEMETRY_FIXTURE;
  const events = fs.existsSync(telemetryPath)
    ? readJson<SelectorOpenEvent[]>(telemetryPath)
    : [];

  const results: SelectorValidationResult[] = validatePostApplyOutcomes(
    proposals,
    simulations,
    events,
  );

  const summary = summarizeValidationResults(results);

  fs.mkdirSync(V5_DIR, { recursive: true });
  fs.writeFileSync(
    VALIDATION_OUTPUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2)}\n`,
    "utf8",
  );

  console.log(`validation results written: ${VALIDATION_OUTPUT}`);
  console.log(
    `averageAccuracy=${summary.averageAccuracy.toFixed(3)} flagged=${summary.flaggedCount}/${summary.total}`,
  );
}

main();
