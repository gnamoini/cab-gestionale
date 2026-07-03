import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "lib", "lavorazioni");
const FORBIDDEN = ["workshop-schedule/intelligence", "workshop-schedule/"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const violations: string[] = [];
for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8");
  for (const needle of FORBIDDEN) {
    if (text.includes(needle)) violations.push(`${file}: imports ${needle}`);
  }
}

assert.equal(violations.length, 0, violations.join("\n"));
console.log("workshop-schedule-intelligence-bounded-context.test.ts OK");
