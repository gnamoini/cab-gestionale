/**
 * MAP Observability — per-wave efficiency breakdown.
 *
 * Usage:
 *   npm run form-ux:map:analytics:wave-efficiency
 *   npm run form-ux:map:analytics:wave-efficiency -- --wave 1
 *   npm run form-ux:map:analytics:wave-efficiency -- --json
 */
import {
  buildMapObservabilitySnapshot,
  formatWaveEfficiencyReport,
} from "@/lib/form-ux-migration/form-ux-map-observability-plane";

const JSON_OUT = process.argv.includes("--json");
const root = process.cwd();

function parseWaveArg(): number | undefined {
  const idx = process.argv.indexOf("--wave");
  if (idx < 0 || !process.argv[idx + 1]) return undefined;
  const n = Number(process.argv[idx + 1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const wave = parseWaveArg();
const snapshot = buildMapObservabilitySnapshot({ root });

if (JSON_OUT) {
  const byWave = wave != null ? { [wave]: snapshot.waves.byWave[wave] } : snapshot.waves.byWave;
  console.log(
    JSON.stringify(
      {
        waveEfficiency: snapshot.waves.waveEfficiency,
        inclusionRate: snapshot.waves.inclusionRate,
        rejectionRate: snapshot.waves.rejectionRate,
        byWave,
      },
      null,
      2,
    ),
  );
} else {
  console.log(formatWaveEfficiencyReport({ root, wave }));
}
