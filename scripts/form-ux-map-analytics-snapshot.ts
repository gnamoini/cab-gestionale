/**
 * MAP Observability — write analytics snapshot to disk.
 *
 * Usage:
 *   npm run form-ux:map:analytics:snapshot
 *   npm run form-ux:map:analytics:snapshot -- --json
 */
import {
  buildMapObservabilitySnapshot,
  writeMapObservabilitySnapshot,
} from "@/lib/form-ux-migration/form-ux-map-observability-plane";

const JSON_OUT = process.argv.includes("--json");
const root = process.cwd();

const snapshot = buildMapObservabilitySnapshot({ root });
const filePath = writeMapObservabilitySnapshot(snapshot, { root });

if (JSON_OUT) {
  console.log(JSON.stringify({ filePath, snapshot }, null, 2));
} else {
  console.log(`MAP observability snapshot written: ${filePath}`);
  console.log(`  Tier bands: ${Object.keys(snapshot.classification.tierDistribution).length}`);
  console.log(`  Insights: ${snapshot.insights.length}`);
}
