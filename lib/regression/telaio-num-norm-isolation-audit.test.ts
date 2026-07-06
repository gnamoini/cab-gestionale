import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const WHITELIST = new Set([
  "supabase/migrations/20260908120000_mezzi_telaio_num_norm_unique.sql",
  "src/types/supabase-tables.ts",
  "src/services/mezzi.service.ts",
  "lib/mezzi/vin-normalize.ts",
  "lib/mezzi/vin-normalize.test.ts",
  "src/services/mezzi-vin-unique.test.ts",
  "lib/regression/telaio-num-norm-isolation-audit.test.ts",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|sql|mjs)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

const violations: string[] = [];
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel.startsWith("supabase/migrations/") && rel.includes("telaio_num_norm")) {
    continue;
  }
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes("telaio_num_norm")) continue;
  if (WHITELIST.has(rel)) continue;
  violations.push(rel);
}

assert.equal(
  violations.length,
  0,
  `telaio_num_norm fuori whitelist:\n${violations.join("\n")}`,
);

console.log("telaio-num-norm-isolation-audit.test.ts OK");
