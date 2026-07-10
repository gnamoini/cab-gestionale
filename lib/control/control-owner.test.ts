/**
 * governance.control.owner — readiness gate pre-cutover (active controls 100%)
 */
import fs from "node:fs";
import path from "node:path";
import { resolveCatalogReference } from "@/lib/control/catalog";
import { CONTROL_REGISTRY_VERSION } from "@/lib/control/contract";
import { isControlOwner } from "@/lib/control/owners";
import { CONTROL_REGISTRY } from "@/lib/control/registry";
import type { ControlSeverity } from "@/lib/control/types";

const ROOT = process.cwd();
const SEVERITIES = new Set<ControlSeverity>(["blocker", "warning", "info"]);
const active = CONTROL_REGISTRY.filter((c) => c.status === "active");

function pct(ok: number, total: number): string {
  if (total === 0) return "100%";
  return `${ok}/${total} (${Math.round((ok / total) * 100)}%)`;
}

const blockers: string[] = [];
let ownerOk = 0;
let severityOk = 0;
let sourceOk = 0;
let impactOk = 0;
let lifecycleOk = 0;
let catalogOk = 0;

for (const control of active) {
  if (isControlOwner(control.owner)) ownerOk += 1;
  else blockers.push(`${control.id}: invalid owner`);

  if (SEVERITIES.has(control.severity)) severityOk += 1;
  else blockers.push(`${control.id}: invalid severity`);

  const sot = control.sourceOfTruth?.trim();
  if (sot && fs.existsSync(path.join(ROOT, sot))) sourceOk += 1;
  else blockers.push(`${control.id}: sourceOfTruth missing or not found`);

  if (control.impact?.length) impactOk += 1;
  else blockers.push(`${control.id}: missing impact`);

  lifecycleOk += 1;

  if (resolveCatalogReference(control.implementation.reference)) catalogOk += 1;
  else blockers.push(`${control.id}: catalog ref ${control.implementation.reference}`);
}

const total = active.length;
const metrics = [
  ["owner", ownerOk],
  ["severity", severityOk],
  ["sourceOfTruth", sourceOk],
  ["impact", impactOk],
  ["lifecycle", lifecycleOk],
  ["catalogRef", catalogOk],
] as const;

for (const [, ok] of metrics) {
  if (ok < total) blockers.push(`metric below 100%: ${ok}/${total}`);
}

if (blockers.length > 0) {
  console.error("governance.control.owner — FAIL");
  for (const b of blockers) console.error(`- ${b}`);
  process.exit(1);
}

console.log("governance.control.owner — PASS");
console.log("");
console.log(`registry: ${CONTROL_REGISTRY_VERSION}`);
console.log("");
console.log(`active controls: ${total}`);
console.log("");
for (const [name, ok] of metrics) {
  console.log(`${name}: ${pct(ok, total)}`);
}
