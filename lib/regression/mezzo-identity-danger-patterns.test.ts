/**
 * Audit statico: pattern pericolosi su lookup mezzi per campi operativi.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["lib", "src", "components", "app/api"];

const FORBIDDEN = [
  /\.from\(\s*["']mezzi["']\s*\)[\s\S]{0,200}\.eq\(\s*["']targa["'][\s\S]{0,80}\.(maybeSingle|single)\(\)/,
  /\.from\(\s*["']mezzi["']\s*\)[\s\S]{0,200}\.eq\(\s*["']matricola["'][\s\S]{0,80}\.(maybeSingle|single)\(\)/,
  /\.from\(\s*["']mezzi["']\s*\)[\s\S]{0,200}\.eq\(\s*["']numero_scuderia["'][\s\S]{0,80}\.(maybeSingle|single)\(\)/,
];

const ALLOWLIST = [
  "lib/regression/mezzo-identity-danger-patterns.test.ts",
  "lib/data-import/core/relation-resolver.server.ts",
];

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      out.push(...collectTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

const violations: string[] = [];
for (const dir of SCAN_DIRS) {
  for (const file of collectTsFiles(path.join(ROOT, dir))) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (ALLOWLIST.some((a) => rel.endsWith(a))) continue;
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes('from("mezzi")') && !src.includes("from('mezzi')")) continue;
    for (const re of FORBIDDEN) {
      if (re.test(src)) {
        violations.push(`${rel}: ${re.source.slice(0, 60)}...`);
      }
    }
  }
}

assert.equal(violations.length, 0, `Danger patterns found:\n${violations.join("\n")}`);

const resolver = fs.readFileSync(
  path.join(ROOT, "lib/data-import/core/relation-resolver.server.ts"),
  "utf8",
);
assert.match(resolver, /\.limit\(3\)/, "relation-resolver must limit multi-match queries");

console.log("mezzo-identity-danger-patterns.test.ts OK");
