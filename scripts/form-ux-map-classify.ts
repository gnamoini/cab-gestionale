/**
 * Classify all migration fields by risk tier.
 * Usage: npx tsx scripts/form-ux-map-classify.ts [--json]
 */
import { classifyAllFields } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import { scanMigrationInventory } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";

const JSON_OUT = process.argv.includes("--json");

const { fields } = scanMigrationInventory();
const profiles = classifyAllFields(fields);

if (JSON_OUT) {
  console.log(JSON.stringify(profiles, null, 2));
} else {
  console.log("MAP Field Classification");
  console.log("========================");
  for (const p of profiles.slice(0, 40)) {
    console.log(
      `${p.fieldKey} | tier ${p.tier} (${p.tierLabel}) | ${p.codemodDisposition} | ${p.status}`,
    );
    if (p.signals.length > 0) {
      console.log(`  signals: ${p.signals.join(", ")}`);
    }
  }
  if (profiles.length > 40) {
    console.log(`\n... and ${profiles.length - 40} more (use --json for full list)`);
  }
}
