/**
 * Generate v5 config proposals + offline A/B simulation from telemetry or insights.
 *
 * Usage:
 *   npx tsx scripts/selector-generate-proposals.ts docs/selector-telemetry-snapshot.fixture.json
 *   npx tsx scripts/selector-generate-proposals.ts --from-insights docs/selector-adaptive-insights.json
 *   npx tsx scripts/selector-generate-proposals.ts --from-buffer
 */
import fs from "node:fs";
import path from "node:path";
import { analyzeSelectorTelemetry } from "@/lib/selector-core/selector-adaptive-analyzer";
import { compareAllProposals } from "@/lib/selector-core/selector-ab-simulator";
import { generateProposalsFromReport } from "@/lib/selector-core/selector-insight-promotion-engine";
import {
  createEmptyRegistryState,
  getActiveRegistryState,
  registerProposals,
  savePromotionRegistry,
  __resetPromotionRegistryForTests,
} from "@/lib/selector-core/selector-config-promotion-registry";
import type { SelectorAdaptiveReport } from "@/lib/selector-core/types";
import {
  exportSelectorOpenEventSnapshot,
  type SelectorOpenEvent,
} from "@/lib/selector-core/selector-telemetry";

const V5_DIR = path.join(process.cwd(), "docs", "selector", "v5");
const PROPOSALS_PATH = path.join(V5_DIR, "proposals.json");
const SIMULATION_PATH = path.join(V5_DIR, "simulation-results.json");
const REGISTRY_PATH = path.join(V5_DIR, "promotion-log.json");

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseEvents(raw: string): SelectorOpenEvent[] {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) return parsed as SelectorOpenEvent[];
  if (
    parsed &&
    typeof parsed === "object" &&
    "events" in parsed &&
    Array.isArray((parsed as { events: unknown }).events)
  ) {
    return (parsed as { events: SelectorOpenEvent[] }).events;
  }
  throw new Error("Expected JSON array of selector_open_event or { events: [] }");
}

function loadEvents(argv: string[]): SelectorOpenEvent[] {
  const arg = argv[2];
  if (arg === "--from-insights") return [];
  if (arg === "--from-buffer") return exportSelectorOpenEventSnapshot();
  if (arg && fs.existsSync(arg)) return parseEvents(fs.readFileSync(arg, "utf8"));
  if (!process.stdin.isTTY) return parseEvents(fs.readFileSync(0, "utf8"));
  throw new Error("Provide telemetry snapshot path, --from-insights, --from-buffer, or stdin");
}

function loadReport(argv: string[], events: SelectorOpenEvent[]): SelectorAdaptiveReport {
  const arg = argv[2];
  if (arg === "--from-insights") {
    const insightsPath = argv[3];
    if (!insightsPath || !fs.existsSync(insightsPath)) {
      throw new Error("--from-insights requires path to selector-adaptive-insights.json");
    }
    return readJsonFile(insightsPath) as SelectorAdaptiveReport;
  }
  return analyzeSelectorTelemetry(events);
}

function main(): void {
  const events = loadEvents(process.argv);
  const report = loadReport(process.argv, events);
  const proposals = generateProposalsFromReport(report);
  const simulations =
    events.length > 0 ? compareAllProposals(events, proposals) : [];

  fs.mkdirSync(V5_DIR, { recursive: true });
  fs.writeFileSync(PROPOSALS_PATH, `${JSON.stringify(proposals, null, 2)}\n`, "utf8");
  fs.writeFileSync(SIMULATION_PATH, `${JSON.stringify(simulations, null, 2)}\n`, "utf8");

  __resetPromotionRegistryForTests();
  createEmptyRegistryState();
  registerProposals(proposals);
  savePromotionRegistry(getActiveRegistryState(), REGISTRY_PATH);

  console.log(`proposals written: ${PROPOSALS_PATH} (${proposals.length})`);
  console.log(`simulations written: ${SIMULATION_PATH} (${simulations.length})`);
  console.log(`registry initialized: ${REGISTRY_PATH}`);
}

main();
