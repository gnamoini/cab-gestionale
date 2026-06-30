import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function readActionSources(): string {
  const dir = path.join(ROOT, "src/actions");
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".ts"))
    .map((n) => read(path.join("src/actions", n)))
    .join("\n");
}

function walkSrcTs(dir: string): string {
  let s = "";
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) s += walkSrcTs(p);
    else if (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx")) s += fs.readFileSync(p, "utf8") + "\n";
  }
  return s;
}

const actions = read("src/actions/security-users-permissions.ts");
const adminUsers = read("src/actions/admin-users.ts");
const actionSources = readActionSources();
const panel = read("components/dashboard/security/security-users-permissions-panel.tsx");
const migrations = fs
  .readdirSync(path.join(ROOT, "supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .map((f) => read(path.join("supabase/migrations", f)))
  .join("\n");
const allSrcTs = walkSrcTs(path.join(ROOT, "src"));

const RUOLO_PROFILES_UPDATE = /\.from\(["']profiles["']\)\.update\(\{\s*ruolo/;
const SUPABASE_RUOLO_UPDATE = /supabase\.from\(["']profiles["']\)\.update\(\{\s*ruolo/;

assert.doesNotMatch(actions, RUOLO_PROFILES_UPDATE);
assert.doesNotMatch(adminUsers, RUOLO_PROFILES_UPDATE);
assert.doesNotMatch(actionSources, RUOLO_PROFILES_UPDATE);
assert.doesNotMatch(actionSources, SUPABASE_RUOLO_UPDATE);
assert.doesNotMatch(actionSources, /updateUserRoleByAdminAction/);
assert.doesNotMatch(actionSources, /updateUserByAdmin/);
assert.match(actions, /security_set_user_role/);
assert.match(panel, /Promise\.all/);
assert.match(panel, /refresh:\s*async\s*\(\)\s*=>\s*\{\}/);
assert.match(panel, /queueMicrotask/);
assert.doesNotMatch(migrations, /ENABLE ALWAYS TRIGGER/i);
assert.doesNotMatch(migrations, /set_config\('app\.security_set_user_role',\s*''/);
assert.doesNotMatch(allSrcTs, /current_setting\(\s*['"]app\.security_set_user_role/);

const RUNTIME_FILES = [
  "lib/rbac.ts",
  "src/lib/permissions/effective-permissions.ts",
  "src/lib/auth/effective-module-access.ts",
  "lib/security/user-module-permissions.ts",
  "lib/auth/rbac.ts",
  "components/fatturazione/fatturazione-view.tsx",
  "components/fatturazione/fatturazione-detail-drawer.tsx",
  "components/ddt/ddt-detail-drawer.tsx",
  "components/preventivi/preventivi-view.tsx",
  "components/preventivi/preventivi-editor-modal.tsx",
  "components/gestionale/magazzino/magazzino-view.tsx",
];

for (const f of RUNTIME_FILES) {
  assert.doesNotMatch(read(f), /canAdmin/, `canAdmin in ${f}`);
}

import { assertRouteProtection } from "@/lib/regression/assert-route-protection";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";

const managerSnap = resolveEffectivePermissions({
  userId: "m1",
  ruolo: "manager",
  permissionRows: [],
  pilotDbEnabled: false,
});

assertRouteProtection(
  "manager",
  [
    { pathname: "/dashboard/security", allowed: false },
    { pathname: "/magazzino", allowed: true },
  ],
  managerSnap,
);

console.log("role-switch-hardening.test.ts OK");
