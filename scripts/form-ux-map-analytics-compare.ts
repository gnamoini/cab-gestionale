/**
 * MAP Observability — compare two snapshots.
 *
 * Usage:
 *   npm run form-ux:map:analytics:compare
 *   npm run form-ux:map:analytics:compare -- --json
 *   npm run form-ux:map:analytics:compare -- --prev path/to/prev.json --current path/to/current.json
 */
import fs from "node:fs";
import {
  buildMapObservabilitySnapshot,
  compareSnapshots,
  readMapObservabilitySnapshots,
  type MapObservabilitySnapshot,
} from "@/lib/form-ux-migration/form-ux-map-observability-plane";

const JSON_OUT = process.argv.includes("--json");
const root = process.cwd();

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function loadSnapshot(filePath: string): MapObservabilitySnapshot {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as MapObservabilitySnapshot;
}

const prevPath = parseArg("--prev");
const currentPath = parseArg("--current");

let previous: MapObservabilitySnapshot;
let current: MapObservabilitySnapshot;

if (prevPath && currentPath) {
  previous = loadSnapshot(prevPath);
  current = loadSnapshot(currentPath);
} else {
  const stored = readMapObservabilitySnapshots({ root, limit: 2 });
  if (stored.length >= 2) {
    previous = stored[stored.length - 2]!;
    current = stored[stored.length - 1]!;
  } else {
    current = buildMapObservabilitySnapshot({ root });
    previous = { ...current, timestamp: current.timestamp - 86_400_000 };
  }
}

const comparison = compareSnapshots(previous, current);

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        previousTimestamp: previous.timestamp,
        currentTimestamp: current.timestamp,
        ...comparison,
      },
      null,
      2,
    ),
  );
} else {
  console.log("=== MAP Observability Compare ===");
  console.log("");
  console.log(`Previous: ${new Date(previous.timestamp).toISOString()}`);
  console.log(`Current:  ${new Date(current.timestamp).toISOString()}`);
  console.log("");
  console.log("Delta metrics:");
  console.log(
    `  Include rate: ${(comparison.delta.eligibility.includeRate * 100).toFixed(2)}pp`,
  );
  console.log(
    `  Exclude rate: ${(comparison.delta.eligibility.excludeRate * 100).toFixed(2)}pp`,
  );
  console.log(
    `  Wave efficiency: ${(comparison.delta.waves.waveEfficiency * 100).toFixed(2)}pp`,
  );
  console.log(
    `  Version drift index: ${comparison.delta.versions.versionDriftIndex.toFixed(3)}`,
  );
  console.log("");
  console.log("New insights:");
  if (comparison.newInsights.length === 0) {
    console.log("  (none)");
  } else {
    for (const insight of comparison.newInsights) {
      console.log(`  [${insight.severity}] ${insight.message}`);
    }
  }
}
