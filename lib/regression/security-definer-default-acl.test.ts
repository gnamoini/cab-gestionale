/**
 * Default ACL migration: postgres + supabase_admin for public + storage schemas.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261226120100_security_definer_default_acl_ssot.sql"),
  "utf8",
);

for (const role of ["postgres", "supabase_admin"]) {
  assert.match(
    migration,
    new RegExp(`alter default privileges for role ${role} in schema public`, "i"),
    `${role} public default privileges required`,
  );
  assert.match(
    migration,
    new RegExp(`alter default privileges for role ${role} in schema storage`, "i"),
    `${role} storage default privileges required`,
  );
  assert.match(
    migration,
    new RegExp(`revoke execute on functions from public, anon, authenticated`, "i"),
    `${role} must revoke client EXECUTE defaults`,
  );
}

console.log("security-definer-default-acl.test: OK");
