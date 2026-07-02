import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "supabase/migrations");
const files = fs.readdirSync(dir).filter((f) => f.startsWith("202609011"));
assert.ok(files.length >= 9, `expected >=9 lifecycle migrations, got ${files.length}`);
for (const file of files) {
  const sql = fs.readFileSync(path.join(dir, file), "utf8");
  assert.ok(!/drop table public\.mezzi/i.test(sql), `${file} must not drop mezzi`);
}

const manual = path.join(process.cwd(), "supabase/migrations/manual/20260801120500_drop_mezzi_legacy_attrezzatura.sql");
assert.ok(fs.existsSync(manual), "R4 manual migration must exist");
const auto = fs.readdirSync(dir).filter((f) => f.includes("drop_mezzi_legacy"));
assert.equal(auto.length, 0, "R4 must stay manual-only");

console.log("asset-lifecycle-production-gate.test.ts OK");
