import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const auth = read("lib/media/media-image-auth.server.ts");
assert.match(auth, /verifyImageScopeModuleAccess/, "media auth must centralize scope access");
assert.match(auth, /verifyServerSectionRead/, "media auth must check read");
assert.match(auth, /verifyServerSectionWrite/, "media auth must check write");
assert.doesNotMatch(
  auth,
  /section === "magazzino"/,
  "media auth must not special-case only magazzino",
);

const migration = read("supabase/migrations/20260613120000_storage_magazzino_images_read_fix.sql");
for (const scope of ["lavorazioni", "mezzi", "magazzino"]) {
  assert.match(migration, new RegExp(`v_scope = '${scope}'`), `storage RLS must cover ${scope}`);
  assert.match(
    migration,
    new RegExp(`${scope}'[\\s\\S]*rbac_module_can\\('${scope}', 'write'\\)`),
    `storage RLS ${scope} must allow write fallback`,
  );
}

console.log("media-image-auth-policy.test.ts OK");
