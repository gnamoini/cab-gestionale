import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LEGACY = "lib/maintenance-plans/resolve-plans-for-mezzo.ts";

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const offenders: string[] = [];
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel === LEGACY) continue;
  if (!rel.startsWith("components/") && !rel.startsWith("src/services/")) continue;
  const src = fs.readFileSync(file, "utf8");
  if (src.includes("resolvePlansForMezzo")) offenders.push(rel);
}

assert.deepEqual(
  offenders,
  [],
  `resolvePlansForMezzo must not appear in components/services except ${LEGACY}: ${offenders.join(", ")}`,
);

console.log("maintenance-runtime-no-equipment-junction.test.ts OK");
