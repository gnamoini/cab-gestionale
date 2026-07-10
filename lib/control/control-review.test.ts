/**
 * governance.control.review — guardiano del Control Plane (H5)
 */
import fs from "node:fs";
import path from "node:path";
import { CONTROL_CONTRACT_VERSION, CONTROL_REGISTRY_VERSION } from "@/lib/control/contract";
import { resolveCatalogReference } from "@/lib/control/catalog";
import { validateControlGraph } from "@/lib/control/graph";
import { isControlOwner } from "@/lib/control/owners";
import { CONTROL_REGISTRY } from "@/lib/control/registry";
import type { ControlDefinition } from "@/lib/control/types";

const ROOT = process.cwd();
const blockers: string[] = [];

function fail(msg: string): void {
  blockers.push(msg);
}

function checkControl(control: ControlDefinition): void {
  if (!control.id.includes(".")) fail(`${control.id}: id must use domain.artifact.action`);
  if (!isControlOwner(control.owner)) fail(`${control.id}: invalid owner ${control.owner}`);
  if (!control.sourceOfTruth?.trim()) fail(`${control.id}: missing sourceOfTruth`);
  if (!control.impact?.length) fail(`${control.id}: missing impact`);
  if (!fs.existsSync(path.join(ROOT, control.sourceOfTruth))) {
    fail(`${control.id}: sourceOfTruth not found: ${control.sourceOfTruth}`);
  }
  const entry = resolveCatalogReference(control.implementation.reference);
  if (!entry && control.status === "active") {
    fail(`${control.id}: missing catalog entry ${control.implementation.reference}`);
  }
  if ((control.status === "deprecated" || control.status === "sunset") && !control.sunsetDate) {
    fail(`${control.id}: deprecated/sunset requires sunsetDate`);
  }
}

try {
  validateControlGraph(CONTROL_REGISTRY);
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}

if (!CONTROL_CONTRACT_VERSION) fail("CONTROL_CONTRACT_VERSION missing");
if (!CONTROL_REGISTRY_VERSION) fail("CONTROL_REGISTRY_VERSION missing");

const ids = new Set<string>();
for (const control of CONTROL_REGISTRY) {
  if (ids.has(control.id)) fail(`duplicate control id: ${control.id}`);
  ids.add(control.id);
  checkControl(control);
}

const catalogRefs = new Set(
  CONTROL_REGISTRY.filter((c) => c.status === "active" || c.status === "experimental").map(
    (c) => c.implementation.reference,
  ),
);

for (const ref of catalogRefs) {
  if (!resolveCatalogReference(ref)) fail(`orphan catalog reference in registry: ${ref}`);
}

if (blockers.length > 0) {
  console.error("governance.control.review — FAIL");
  for (const b of blockers) console.error(`- ${b}`);
  process.exit(1);
}

console.log("governance.control.review — PASS");
console.log(`controls: ${CONTROL_REGISTRY.length}`);
console.log(`contract: ${CONTROL_CONTRACT_VERSION} registry: ${CONTROL_REGISTRY_VERSION}`);
