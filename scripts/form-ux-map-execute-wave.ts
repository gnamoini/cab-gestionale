/**
 * MAP Wave Execution CLI — generates manifest, rollout patch, impact report.
 *
 * Usage:
 *   npx tsx scripts/form-ux-map-execute-wave.ts --wave 1
 *   npx tsx scripts/form-ux-map-execute-wave.ts --wave 1 --json
 *   npx tsx scripts/form-ux-map-execute-wave.ts --wave 1 --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { buildWaveImpactReport } from "@/lib/form-ux-migration/map-wave-1-impact-report";
import {
  buildWaveExecutionPlan,
  formatExecutiveSummary,
  formatTechnicalSummary,
} from "@/lib/form-ux-migration/form-ux-wave-executor";

function parseWaveArg(): number {
  const idx = process.argv.indexOf("--wave");
  if (idx < 0 || !process.argv[idx + 1]) return 1;
  const n = Number(process.argv[idx + 1]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

const wave = parseWaveArg();
const JSON_OUT = process.argv.includes("--json");
const DRY_RUN = process.argv.includes("--dry-run");

const plan = buildWaveExecutionPlan(wave);
const impact = buildWaveImpactReport(plan.manifest);
const artifactDir = path.join(process.cwd(), "map", "waves", `wave-${wave}`);

const output = {
  plan,
  impact,
  artifactDir,
};

if (JSON_OUT) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(formatExecutiveSummary(plan, impact));
  console.log("");
  console.log(formatTechnicalSummary(plan, artifactDir));
}

if (!DRY_RUN && !JSON_OUT) {
  fs.mkdirSync(artifactDir, { recursive: true });
  const manifestPath = path.join(artifactDir, `map-wave-${wave}-manifest.json`);
  const patchPath = path.join(artifactDir, `map-wave-${wave}-rollout-patch.json`);
  const impactPath = path.join(artifactDir, `map-wave-${wave}-impact.json`);

  fs.writeFileSync(manifestPath, JSON.stringify(plan.manifest, null, 2), "utf8");
  fs.writeFileSync(patchPath, JSON.stringify(plan.rolloutPatch, null, 2), "utf8");
  fs.writeFileSync(impactPath, JSON.stringify(impact, null, 2), "utf8");

  console.log("");
  console.log(`Artifacts written to ${artifactDir}`);
}
