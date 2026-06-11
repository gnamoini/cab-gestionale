/**
 * MAP Observability — human-readable analytics report.
 *
 * Usage:
 *   npm run form-ux:map:analytics:report
 *   npm run form-ux:map:analytics:report -- --json
 */
import {
  buildMapObservabilitySnapshot,
  formatMapObservabilityReport,
} from "@/lib/form-ux-migration/form-ux-map-observability-plane";

const JSON_OUT = process.argv.includes("--json");
const root = process.cwd();

const snapshot = buildMapObservabilitySnapshot({ root });

if (JSON_OUT) {
  console.log(JSON.stringify(snapshot, null, 2));
} else {
  console.log(formatMapObservabilityReport(snapshot));
}
