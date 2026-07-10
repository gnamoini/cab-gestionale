#!/usr/bin/env npx tsx
/**
 * Inventory drift vs baseline (observe tier).
 * npm run control:inventory-drift
 */
import fs from "node:fs";
import path from "node:path";

const BASELINE = path.join(process.cwd(), "control-inventory.baseline.json");
const CURRENT = path.join(process.cwd(), "control-inventory.json");

type Inv = {
  summary: Record<string, number>;
  npmScripts: { id: string }[];
};

function main(): void {
  if (!fs.existsSync(CURRENT)) {
    console.error("Missing control-inventory.json — run control:inventory");
    process.exit(1);
  }
  if (!fs.existsSync(BASELINE)) {
    console.log("control:inventory-drift — no baseline, observe only");
    console.log("  hint: cp control-inventory.json control-inventory.baseline.json");
    process.exit(0);
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8")) as Inv;
  const current = JSON.parse(fs.readFileSync(CURRENT, "utf8")) as Inv;

  const baseIds = new Set(baseline.npmScripts.map((s) => s.id));
  const curIds = new Set(current.npmScripts.map((s) => s.id));
  const added = [...curIds].filter((id) => !baseIds.has(id));
  const removed = [...baseIds].filter((id) => !curIds.has(id));

  console.log("control:inventory-drift — observe");
  console.log(`  npmScripts baseline=${baseline.summary.npmScripts} current=${current.summary.npmScripts}`);
  if (added.length) console.log(`  added: ${added.join(", ")}`);
  if (removed.length) console.log(`  removed: ${removed.join(", ")}`);
  if (!added.length && !removed.length) console.log("  no npm script drift");
}

main();
