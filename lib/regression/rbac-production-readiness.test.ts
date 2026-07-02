/**
 * Checklist release readiness RBAC (11 criteri automatizzati).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const checks: Array<{ id: string; ok: boolean; detail?: string }> = [];

// 1 SSOT adapter
checks.push({
  id: "SSOT adapter rbac-snapshot-access",
  ok: exists("src/lib/rbac/rbac-snapshot-access.ts"),
});

// 2 RequiredRbacContext on hasPermission
const rbac = read("lib/auth/rbac.ts");
checks.push({
  id: "hasPermission requires RequiredRbacContext",
  ok: /hasPermission\(user: RbacUser, permission: PermissionKey, ctx: RequiredRbacContext\)/.test(rbac),
});

// 3 useRbacNavAccess hook
checks.push({
  id: "useRbacNavAccess unified nav hook",
  ok: exists("src/hooks/use-rbac-nav-access.ts"),
});

// 4 app-shell uses nav access + skeleton
const appShell = read("components/gestionale/app-shell.tsx");
checks.push({
  id: "app-shell useRbacNavAccess + skeleton",
  ok: appShell.includes("useRbacNavAccess") && appShell.includes("SidebarNavSkeleton"),
});

// 5 invalidate hub client+server
checks.push({
  id: "invalidateRbacTruth hubs",
  ok: exists("src/lib/rbac/invalidate-rbac-truth.ts") && exists("src/lib/rbac/invalidate-rbac-truth.server.ts"),
});

// 6 proxy uses snapshot
const proxy = read("src/middleware/proxy-handler.ts");
checks.push({
  id: "proxy-handler snapshot-based client portal",
  ok: proxy.includes("resolveEffectivePermissions") && proxy.includes("createRbacNavAccess"),
});

// 7 auth-context SSR hydration role keys
const authCtx = read("context/auth-context.tsx");
checks.push({
  id: "auth-context hydrates rolePermissionKeys",
  ok: authCtx.includes('"role-keys"') && authCtx.includes("publishStickyRbacSnapshot"),
});

// 8 regression hardening tests exist
const hardeningTests = [
  "lib/regression/rbac-entrypoint-audit.test.ts",
  "lib/regression/sidebar-nav-rbac.test.ts",
  "lib/regression/rbac-ssr-client-parity.test.ts",
  "lib/regression/rbac-cross-layer-matrix.test.ts",
  "lib/regression/rbac-cache-invalidation.test.ts",
];
checks.push({
  id: "hardening test files present",
  ok: hardeningTests.every(exists),
});

// 9 package.json test:rbac:hardening script
const pkg = read("package.json");
checks.push({
  id: "test:rbac:hardening npm script",
  ok: pkg.includes('"test:rbac:hardening"'),
});

// 10 e2e smoke rbac nav spec
checks.push({
  id: "e2e rbac nav smoke spec",
  ok: exists("e2e/smoke/20-rbac-nav-by-role.spec.ts"),
});

// 11 post-deploy smoke script
checks.push({
  id: "post-deploy rbac smoke script",
  ok: exists("scripts/post-deploy-rbac-smoke.ts"),
});

const failed = checks.filter((c) => !c.ok);
assert.equal(failed.length, 0, `RBAC production readiness failed:\n${failed.map((f) => `- ${f.id}`).join("\n")}`);

console.log(`rbac-production-readiness.test.ts OK (${checks.length} checks)`);
