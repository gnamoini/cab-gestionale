/**
 * Login username resolve policy: SERVER_ONLY RPC, no anon grant, fail-closed Server Action.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/security/rpc-access-manifest.json");
const MIGRATION_REVOKE = path.join(
  ROOT,
  "supabase/migrations/20261230130000_login_resolve_revoke_anon.sql",
);
const RESOLVE_ACTION = path.join(ROOT, "src/actions/resolve-login-email.ts");
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
  entries: Record<
    string,
    { classification: string; grants: string[]; anonAllow?: boolean; notes?: string }
  >;
};

const entry = manifest.entries["resolve_auth_email_for_login(p_identifier text)"];
assert.ok(entry, "manifest entry for resolve_auth_email_for_login");
assert.equal(entry.classification, "SERVER_ONLY");
assert.deepEqual(entry.grants, ["service_role"]);
assert.equal(entry.anonAllow, false);
assert.ok(!entry.grants.includes("anon"));

const revokeSql = fs.readFileSync(MIGRATION_REVOKE, "utf8");
assert.match(revokeSql, /revoke execute on function public\.resolve_auth_email_for_login\(text\) from public, anon, authenticated/i);
assert.match(revokeSql, /grant execute on function public\.resolve_auth_email_for_login\(text\) to service_role/i);
assert.doesNotMatch(revokeSql, /grant execute[^;]*\banon\b/i);

const actionSrc = fs.readFileSync(RESOLVE_ACTION, "utf8");
assert.match(actionSrc, /admin\.rpc\("resolve_auth_email_for_login"/);
assert.doesNotMatch(actionSrc, /resolveSignInEmailLegacy/);
assert.match(actionSrc, /if \(!serviceKey\)[\s\S]*return \{ email: "" \}/);

const generator = fs.readFileSync(path.join(ROOT, "scripts/generate-rpc-access-manifest.ts"), "utf8");
assert.match(generator, /"resolve_auth_email_for_login"/);
assert.doesNotMatch(generator, /PUBLIC_SAFE = new Set\(\["resolve_auth_email_for_login"\]\)/);

const REVOKE_MIGRATION = "20261230130000_login_resolve_revoke_anon.sql";

const postRevokeMigrations = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql") && f > REVOKE_MIGRATION)
  .sort();

for (const file of postRevokeMigrations) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
  if (!sql.includes("resolve_auth_email_for_login")) continue;
  const grantsAnon = /grant\s+execute\s+[^;]*resolve_auth_email_for_login[^;]*\banon\b/i.test(sql);
  assert.equal(grantsAnon, false, `${file} must not GRANT EXECUTE to anon for resolve_auth_email_for_login`);
}

console.log("login-username-resolve-policy.test.ts OK");
