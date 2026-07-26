import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(full, acc);
    } else if (/\.(tsx|ts)$/.test(ent.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const allowlist = [
  "lib/lavorazioni/addetto-model.ts",
  "lib/lavorazioni/addetto-display.ts",
  "lib/lavorazioni/resolve-addetto-display.ts",
  "lib/lavorazioni/addetto-colors-assign.ts",
  "lib/schede/schede-addetto-id-migrate.ts",
  "lib/lavorazioni/addetto-write-freeze.ts",
  "lib/preventivi/preventivi-storage.ts",
  "lib/document-capture/",
  "lib/regression/",
  "lib/lavorazioni/addetto-display.test.ts",
];

function allowed(rel: string): boolean {
  const norm = rel.replace(/\\/g, "/");
  return allowlist.some((a) => norm.includes(a.replace(/\\/g, "/")));
}

const scanRoots = ["components", "app"].map((d) => path.join(ROOT, d)).filter((d) => fs.existsSync(d));
const violations: string[] = [];

for (const root of scanRoots) {
  for (const file of walk(root)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const src = read(rel);
    if (src.includes('listKey="lavorazioni:addetti"')) {
      violations.push(`${rel}: GlobalSettingsListSelect lavorazioni:addetti`);
    }
    if (src.includes('placeholder="Nome addetto"')) {
      violations.push(`${rel}: free-text addetto input`);
    }
    if (!allowed(rel) && src.includes("addettoDisplayNameFromNome(")) {
      violations.push(`${rel}: addettoDisplayNameFromNome outside allowlist`);
    }
  }
}

assert.equal(violations.length, 0, violations.join("\n"));

const domainPicker = read("components/domain/addetti/addetto-picker.tsx");
assert.match(domainPicker, /AddettoPicker/);

console.log("addetti-domain-policy-audit.test.ts OK");
