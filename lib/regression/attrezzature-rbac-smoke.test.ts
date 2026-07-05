import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { canRead, canWrite } from "@/lib/auth/rbac";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import type { RequiredRbacContext } from "@/lib/auth/rbac";

function ctx(roleKey: string): RequiredRbacContext {
  return buildTestSnapshot({ userId: `${roleKey}-1`, roleKey }).rbacContext as RequiredRbacContext;
}

const repoRoot = process.cwd();
const rlsSql = fs.readFileSync(
  path.join(repoRoot, "supabase/migrations/20260801120200_attrezzature_rls_realtime.sql"),
  "utf8",
);

assert.match(rlsSql, /when 'attrezzature'/);
assert.match(rlsSql, /rbac_can_read_row/);
assert.match(rlsSql, /rbac_scope_cliente/);
assert.match(rlsSql, /join public\.mezzi m on m\.id = a\.mezzo_id/);

// Modulo mezzi: operatore write, ufficio escluso, admin full
assert.equal(canRead("operatore", "mezzi", ctx("operatore")), true);
assert.equal(canWrite("operatore", "mezzi", ctx("operatore")), true);
assert.equal(canRead("addetto_amministrativo", "mezzi", ctx("addetto_amministrativo")), false);
assert.equal(canWrite("addetto_amministrativo", "mezzi", ctx("addetto_amministrativo")), false);
assert.equal(canRead("admin", "mezzi", ctx("admin")), true);
assert.equal(canWrite("admin", "mezzi", ctx("admin")), true);

const importPlugin = fs.readFileSync(
  path.join(repoRoot, "lib/data-import/entities/mezzi/mezzi-import.plugin.server.ts"),
  "utf8",
);
assert.match(importPlugin, /from\("attrezzature"\)/);

console.log("attrezzature-rbac-smoke.test.ts OK");
