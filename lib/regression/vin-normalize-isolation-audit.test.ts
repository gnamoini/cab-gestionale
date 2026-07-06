import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SSOT = path.join(ROOT, "lib/mezzi/vin-normalize.ts");

const FORBIDDEN = [
  /\.toUpperCase\(\)\.trim\(\)/,
  /\.trim\(\)\.toUpperCase\(\)/,
  /upper\s*\(\s*trim\s*\(/i,
  /lower\s*\(\s*trim\s*\(/i,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|mjs)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

const hits: string[] = [];
for (const file of walk(ROOT)) {
  if (path.resolve(file) === path.resolve(SSOT)) continue;
  if (file.includes(`${path.sep}vin-normalize.test.ts`)) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  const vinContext = /\bvin\b/i.test(src) || /\btelaio_num\b/.test(src);
  if (!vinContext) continue;
  for (const re of FORBIDDEN) {
    if (re.test(src)) {
      hits.push(`${rel}: ${re}`);
      break;
    }
  }
}

assert.equal(hits.length, 0, `Canonicalizzazione VIN duplicata fuori SSOT:\n${hits.join("\n")}`);

console.log("vin-normalize-isolation-audit.test.ts OK");
