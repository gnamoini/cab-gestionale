import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { scanProductionReadinessCode } from "@/lib/production/production-readiness-scan";

const repoRoot = process.cwd();
const scan = scanProductionReadinessCode(repoRoot);

assert.equal(typeof scan.legacyMezziColumnWriteHits, "object");
assert.equal(typeof scan.legacyAdapterImportOutsideAllowlist, "object");

const importPlugin = fs.readFileSync(
  path.join(repoRoot, "lib/data-import/entities/mezzi/mezzi-import.plugin.server.ts"),
  "utf8",
);
assert.match(importPlugin, /from\("attrezzature"\)/);

const companion = fs.readFileSync(
  path.join(repoRoot, "supabase/migrations/manual/20260801120650_r4_drop_legacy_guard.sql"),
  "utf8",
);
assert.match(companion, /guard_mezzi_legacy_attrezzatura_write/);

const auditScript = fs.readFileSync(path.join(repoRoot, "scripts/audit-release-v2-db.ts"), "utf8");
assert.match(auditScript, /--r4-ready/);

console.log("audit-release-v2-db.test.ts OK");
