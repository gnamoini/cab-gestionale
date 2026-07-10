/**
 * governance.registry.size + governance.lifecycle.deprecated
 */
import { CONTROL_REGISTRY } from "@/lib/control/registry";

const blockers: string[] = [];
const warnings: string[] = [];

const active = CONTROL_REGISTRY.filter((c) => c.status === "active");

if (active.length > 80) {
  blockers.push(`active controls ${active.length} > 80 (blocker threshold)`);
} else if (active.length > 45) {
  warnings.push(`active controls ${active.length} > 45 (warning threshold)`);
}

for (const control of CONTROL_REGISTRY) {
  if ((control.status === "deprecated" || control.status === "sunset") && !control.sunsetDate) {
    blockers.push(`${control.id}: deprecated/sunset without sunsetDate`);
  }
}

if (blockers.length > 0) {
  console.error("governance.registry.lifecycle — FAIL");
  for (const b of blockers) console.error(`- ${b}`);
  process.exit(1);
}

for (const w of warnings) console.log(`warn: ${w}`);
console.log("governance.registry.lifecycle — PASS");
console.log(`active=${active.length} total=${CONTROL_REGISTRY.length}`);
