/**
 * governance.control.coverage — inventory → registry mapping (warning-only Sprint 6)
 */
import fs from "node:fs";
import path from "node:path";
import { computeCoverageGaps, catalogReferenceCoverage } from "@/lib/control/coverage-map";

const ROOT = process.cwd();
const INVENTORY = path.join(ROOT, "control-inventory.json");
const STRICT_SECURITY =
  process.argv.includes("--strict-security") || process.env.CONTROL_COVERAGE_STRICT === "1";

function main(): void {
  if (!fs.existsSync(INVENTORY)) {
    console.error("Missing control-inventory.json — run npm run control:inventory");
    process.exit(1);
  }

  const inventory = JSON.parse(fs.readFileSync(INVENTORY, "utf8")) as Parameters<
    typeof computeCoverageGaps
  >[0];
  const gaps = computeCoverageGaps(inventory);
  const catalogCov = catalogReferenceCoverage();

  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const gap of gaps) {
    const msg = `unmapped gate-like ${gap.kind}: ${gap.inventoryId} (domain=${gap.domain})`;
    if (STRICT_SECURITY && ["security", "data", "production"].includes(gap.domain)) {
      blockers.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  if (catalogCov < 0.99) {
    warnings.push(`catalog reference coverage ${(catalogCov * 100).toFixed(1)}%`);
  }

  console.log("governance.control.coverage");
  console.log(`  gaps=${gaps.length} catalogCoverage=${(catalogCov * 100).toFixed(1)}%`);
  console.log(`  warnings=${warnings.length} blockers=${blockers.length}`);

  if (warnings.length > 0 && !STRICT_SECURITY) {
    for (const w of warnings.slice(0, 15)) console.log(`  warn: ${w}`);
    if (warnings.length > 15) console.log(`  ... +${warnings.length - 15} more`);
  }

  if (blockers.length > 0) {
    console.error("governance.control.coverage — FAIL");
    for (const b of blockers) console.error(`- ${b}`);
    process.exit(1);
  }

  console.log("governance.control.coverage — PASS");
}

main();
