/**
 * Gate merge: pattern RBAC legacy vietati nel codice applicativo.
 * Esclude migrazioni SQL, docs, test legacy esplicitamente allowlistati.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components", "context", "lib", "src"];
const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "generated", "supabase"]);
const SKIP_FILE_RE = /\.(test|spec)\.(ts|tsx)$/;

/** File legacy documentati — da rimuovere in follow-up RLS/seed cleanup. */
const ALLOWLIST_FILES = new Set([
  "lib/rbac-seed.ts",
  "lib/rbac.ts",
  "src/lib/rbac/resolve-user-permissions.ts",
  "src/lib/permissions/effective-permissions.ts",
  "lib/security/user-module-permissions.ts",
  "components/dashboard/security/security-user-module-permissions-editor.tsx",
  "lib/production/production-readiness.ts",
  "lib/production/production-readiness-scan.ts",
  "src/lib/auth/effective-module-access.ts",
  "src/actions/security-users-permissions.ts",
  "src/lib/rbac/resolve-page-access.ts",
  "src/actions/security-roles-permissions.ts",
  "src/actions/admin-users.ts",
  "src/actions/security-release-control.ts",
  "src/types/supabase-tables.ts",
  "src/lib/react-query/query-keys.ts",
  "src/lib/react-query/invalidate-targets.ts",
  "src/lib/permissions/gestionale-modules.ts",
  "src/components/gestionale-realtime-bridge.tsx",
  "src/components/admin-workshop-schedule-notification-bridge.tsx",
  "lib/sync/cab-sync-bus.ts",
  "lib/permissions/operator-global-settings.ts",
  "components/dashboard/security-dashboard-view.tsx",
]);

const FORBIDDEN: Array<{ name: string; re: RegExp }> = [
  { name: "PermissionKey type/import runtime", re: /\bPermissionKey\b/ },
  { name: "hasPermission", re: /\bhasPermission\s*\(/ },
  { name: "hasCapability", re: /\bhasCapability\s*\(/ },
  { name: "can_read_operational", re: /can_read_operational/ },
  { name: "can_manage_settings capability", re: /can_manage_settings/ },
  { name: "can_manage_security capability", re: /can_manage_security/ },
  { name: "role_permissions table in app", re: /role_permissions/ },
  { name: "user_permissions table in app", re: /user_permissions/ },
  { name: "client_portal_access allowlist", re: /client_portal_access/ },
  { name: "ensurePermission stub", re: /\bensurePermission\s*\(/ },
  { name: "verifyServerPermission stub", re: /\bverifyServerPermission\s*\(/ },
  { name: "ensureWorkflowWrite", re: /\bensureWorkflowWrite\s*\(/ },
  { name: "ensureSectionRead bridge", re: /\bensureSectionRead\s*\(/ },
  { name: "verifyServerSectionRead bridge", re: /\bverifyServerSectionRead\s*\(/ },
];

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (SKIP_FILE_RE.test(entry.name)) continue;
    out.push(full);
  }
}

const files: string[] = [];
for (const dir of SCAN_DIRS) {
  const abs = path.join(ROOT, dir);
  if (fs.existsSync(abs)) walk(abs, files);
}

const violations: string[] = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (ALLOWLIST_FILES.has(rel)) continue;
  const src = fs.readFileSync(file, "utf8");
  for (const { name, re } of FORBIDDEN) {
    if (re.test(src)) violations.push(`${rel}: ${name}`);
  }
}

assert.equal(violations.length, 0, `RBAC legacy audit failed:\n${violations.join("\n")}`);
console.log("rbac-legacy-audit.test.ts OK");
