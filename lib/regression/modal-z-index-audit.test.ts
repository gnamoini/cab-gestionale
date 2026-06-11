/**
 * Audit: z-index modali — usare cabModalLayerClass / cabModalZ* SSOT, non literal z-[120].
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const ALLOWLIST = new Set([
  "lib/ui/mobile-modal-behavior.ts",
  "lib/ui/design-system.ts",
  "lib/ui/ios-mobile-tokens.ts",
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, acc);
    } else if (/\.(tsx|ts)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

const offenders: string[] = [];
for (const dir of ["components", "lib"]) {
  for (const file of walk(path.join(ROOT, dir))) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (ALLOWLIST.has(rel)) continue;
    const src = fs.readFileSync(file, "utf8");
    if (/layerClassName=["']z-\[120\]/.test(src) || /className=["'][^"']*z-\[120\]/.test(src)) {
      if (!src.includes("cabModalZConfirm") && !src.includes("cabModalLayerClass")) {
        offenders.push(rel);
      }
    }
  }
}

assert.equal(
  offenders.length,
  0,
  `Literal z-[120] outside SSOT:\n${offenders.join("\n")}`,
);

console.log("modal-z-index-audit.test.ts OK");
