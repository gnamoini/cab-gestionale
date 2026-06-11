/**
 * MAP roadmap + audit CLI.
 * Usage: npx tsx scripts/form-ux-map-roadmap.ts [--json]
 */
import { buildAdoptionReport } from "@/lib/form-ux-migration/form-ux-adoption-report";
import { classifyAllFields } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import { scanMigrationInventory } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import {
  buildMigrationWaves,
  formatRoadmapText,
} from "@/lib/form-ux-migration/form-ux-migration-queue";
import {
  buildBurndownSnapshot,
  computeBurndownTrend,
  etaDaysToTarget,
} from "@/lib/form-ux-migration/form-ux-legacy-burndown";

const JSON_OUT = process.argv.includes("--json");

const { fields } = scanMigrationInventory();
const profiles = classifyAllFields(fields);
const trend = computeBurndownTrend();
const waves = buildMigrationWaves(profiles, {
  velocityFieldsPerWeek: trend.velocityFieldsPerWeek,
});
const report = buildAdoptionReport();
const snapshot = buildBurndownSnapshot();

const audit = {
  currentState: {
    legacyFields: snapshot.legacyRemaining,
    ssotFields: Math.round((report.global.ssotPct / 100) * snapshot.totalFields),
    coveragePct: report.global.ssotPct,
    totalFields: snapshot.totalFields,
  },
  targetState: {
    pct50EtaDays: etaDaysToTarget(50),
    pct80EtaDays: trend.etaDaysTo80,
    pct100EtaDays: trend.etaDaysTo100,
  },
  waves,
  metrics: {
    velocityFieldsPerWeek: trend.velocityFieldsPerWeek,
    rollbackRate: trend.rollbackRate,
    mismatchRate: trend.mismatchRate,
    promotionRate: trend.promotionRate,
  },
};

if (JSON_OUT) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log("=== MAP Audit ===");
  console.log("");
  console.log("Current State");
  console.log(`  Legacy fields: ${audit.currentState.legacyFields}`);
  console.log(`  SSOT fields: ${audit.currentState.ssotFields}`);
  console.log(`  Coverage: ${audit.currentState.coveragePct}%`);
  console.log("");
  console.log("Target State");
  console.log(`  50%: ETA ${audit.targetState.pct50EtaDays} giorni`);
  console.log(`  80%: ETA ${audit.targetState.pct80EtaDays} giorni`);
  console.log(`  100%: ETA ${audit.targetState.pct100EtaDays} giorni`);
  console.log("");
  console.log(formatRoadmapText(waves));
}
