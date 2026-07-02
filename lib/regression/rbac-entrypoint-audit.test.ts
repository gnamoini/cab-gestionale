/**
 * CI audit: vietate chiamate RBAC runtime senza snapshot risolto.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = ["app", "components", "context", "lib", "src"];
const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "generated", "regression"]);
const SKIP_FILE_RE = /\.(test|spec)\.(ts|tsx)$/;
const ALLOWLIST_FILES = new Set([
  "lib/auth/rbac.ts",
  "lib/rbac.ts",
  "src/lib/rbac/rbac-snapshot-access.ts",
  "lib/regression/rbac-test-fixtures.ts",
  "lib/rbac-seed.ts",
]);

const FORBIDDEN_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "hasPermission 2-arg (no ctx)", re: /hasPermission\(\s*[^,]+,\s*["'`][^"'`]+["'`]\s*\)/ },
  { name: "rbacSeedPermissionKeysForRole runtime", re: /rbacSeedPermissionKeysForRole\(/ },
  { name: "shouldHideNavHref without ctx (3-arg)", re: /shouldHideNavHref\([^)]+\)\s*;/ },
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
  if (src.includes("hasPermissionUnsafe")) continue;

  for (const { name, re } of FORBIDDEN_PATTERNS) {
    if (name === "shouldHideNavHref without ctx (3-arg)") {
      const matches = src.match(/shouldHideNavHref\([^)]*\)/g) ?? [];
      for (const m of matches) {
        const commaCount = (m.match(/,/g) ?? []).length;
        if (commaCount < 3) {
          violations.push(`${rel}: ${name} → ${m}`);
        }
      }
      continue;
    }
    if (re.test(src)) {
      violations.push(`${rel}: ${name}`);
    }
  }
}

assert.equal(violations.length, 0, `RBAC entrypoint audit failed:\n${violations.join("\n")}`);

const requiredWiring = [
  "components/gestionale/app-shell.tsx",
  "src/hooks/use-rbac-nav-access.ts",
  "src/lib/rbac/invalidate-rbac-truth.ts",
  "src/lib/rbac/invalidate-rbac-truth.server.ts",
  "src/middleware/proxy-handler.ts",
];

for (const rel of requiredWiring) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing required RBAC file: ${rel}`);
}

const rolesActions = fs.readFileSync(path.join(ROOT, "src/actions/security-roles-permissions.ts"), "utf8");
assert.match(rolesActions, /invalidateRbacTruthServer\(\)/, "role matrix mutations must invalidate RBAC server cache");

console.log("rbac-entrypoint-audit.test.ts OK");
