/**
 * Audit: footer modali form — niente zinc legacy inline nei *modal*.tsx.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, acc);
    } else if (/modal.*\.tsx$/i.test(name) || name.endsWith("-modals.tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

const offenders: string[] = [];
for (const file of walk(path.join(ROOT, "components"))) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  if (/border-zinc-200 bg-white px-4 py-3/.test(src)) {
    offenders.push(`${rel}: legacy zinc footer inside modal`);
  }
}

assert.equal(
  offenders.length,
  0,
  `Modal footer zinc legacy:\n${offenders.join("\n")}`,
);

console.log("modal-footer-ssot-audit.test.ts OK");
