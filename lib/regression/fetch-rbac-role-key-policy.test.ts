import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const src = read("lib/rbac/fetch-rbac-role-key.ts");
assert.match(src, /user_roles/);
assert.match(src, /role_key/);
assert.match(src, /fetchRbacRoleKeyForUser/);

const clientAccess = read("src/lib/auth/client-lavorazioni-access-server.ts");
assert.match(clientAccess, /fetchRbacRoleKeyForUser/);

console.log("fetch-rbac-role-key-policy: OK");
