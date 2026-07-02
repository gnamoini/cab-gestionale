import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { scanProductionReadinessCode } from "@/lib/production/production-readiness-scan";

const repoRoot = process.cwd();
const scan = scanProductionReadinessCode(repoRoot);

assert.equal(scan.r4DropMigrationInAutoPath, false, "R4 drop must not be in auto migrations");
assert.equal(
  fs.existsSync(path.join(repoRoot, "supabase", "migrations", "manual", "20260801120500_drop_mezzi_legacy_attrezzatura.sql")),
  true,
  "R4 drop must exist under manual/",
);

assert.equal(scan.legacyAdapterImportOutsideAllowlist.length, 0, scan.legacyAdapterImportOutsideAllowlist.map((h) => `${h.file}:${h.line}`).join(", "));

console.log("attrezzature-v2-production-gate.test.ts OK");
