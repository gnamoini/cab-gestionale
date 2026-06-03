/**
 * Promemoria soft delete: RPC + policy UPDATE (allineamento lavorazioni).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260707130000_dashboard_promemoria_soft_delete_rls.sql"),
  "utf8",
);
const service = fs.readFileSync(
  path.join(ROOT, "src/services/dashboard-promemoria.service.ts"),
  "utf8",
);

assert.match(migration, /soft_delete_dashboard_promemoria/);
assert.match(migration, /security definer/);
assert.match(migration, /with check\s*\(\s*\n\s*public\.rbac_has_capability/);
assert.match(migration, /and deleted_at is null/);
assert.match(service, /rpc\("soft_delete_dashboard_promemoria"/);

console.log("dashboard-promemoria-soft-delete-rpc.test: OK");
