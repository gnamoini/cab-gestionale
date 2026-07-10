/**
 * Registry parity — active controls have catalog entries; graph valid.
 */
import fs from "node:fs";
import path from "node:path";
import { resolveCatalogReference } from "@/lib/control/catalog";
import { validateControlGraph } from "@/lib/control/graph";
import { CONTROL_REGISTRY } from "@/lib/control/registry";

const ROOT = process.cwd();
const blockers: string[] = [];

try {
  validateControlGraph(CONTROL_REGISTRY);
} catch (e) {
  blockers.push(e instanceof Error ? e.message : String(e));
}

for (const control of CONTROL_REGISTRY) {
  if (control.status === "sunset" || control.status === "disabled") continue;
  if (!fs.existsSync(path.join(ROOT, control.sourceOfTruth))) {
    blockers.push(`${control.id}: missing sourceOfTruth ${control.sourceOfTruth}`);
  }
  if (
    (control.status === "active" || control.status === "experimental" || control.status === "deprecated") &&
    !resolveCatalogReference(control.implementation.reference)
  ) {
    blockers.push(`${control.id}: no catalog for ${control.implementation.reference}`);
  }
}

const workflowPath = path.join(ROOT, ".github/workflows/release-gate.yml");
if (fs.existsSync(workflowPath)) {
  const wf = fs.readFileSync(workflowPath, "utf8");
  if (!wf.includes("control-pr-shadow") && !wf.includes("release-gate")) {
    blockers.push("release-gate.yml missing expected job");
  }
}

if (blockers.length > 0) {
  console.error("registry-parity — FAIL");
  for (const b of blockers) console.error(`- ${b}`);
  process.exit(1);
}

console.log("registry-parity — PASS");
console.log(`registry entries: ${CONTROL_REGISTRY.length}`);
