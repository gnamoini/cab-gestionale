import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "components", "gestionale", "mezzi");
const FORBIDDEN = /impostazioni/i;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...walk(p));
    else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

const violations: string[] = [];
for (const file of walk(ROOT)) {
  if (!file.includes("tagliandi")) continue;
  const text = readFileSync(file, "utf8");
  if (FORBIDDEN.test(text)) violations.push(file.replace(process.cwd(), ""));
}

assert.equal(violations.length, 0, `Impostazioni copy in tagliandi UI: ${violations.join(", ")}`);
console.log("tagliandi-ui-copy-audit.test ok");
