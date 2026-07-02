import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** Client files della pagina Sicurezza — elenco chiuso per evitare falsi positivi. */
const SECURITY_CLIENT_FILES = [
  "components/dashboard/security-dashboard-view.tsx",
  "components/dashboard/security/security-users-permissions-panel.tsx",
  "components/dashboard/security/security-users-table.tsx",
  "components/dashboard/security/security-user-detail-drawer.tsx",
  "components/dashboard/security/security-user-module-permissions-editor.tsx",
  "components/dashboard/security/security-monitoring-section.tsx",
  "components/dashboard/security/security-release-section.tsx",
  "components/dashboard/security/security-edit-name-modal.tsx",
  "components/dashboard/security-create-user-modal.tsx",
  "components/dashboard/security/security-role-badge.tsx",
  "components/dashboard/security/security-inline-notice.tsx",
  "components/dashboard/security/security-cliente-audit-panel.tsx",
  "src/hooks/use-security-dashboard-data.ts",
  "src/hooks/use-security-users-permissions-query.ts",
] as const;

const FORBIDDEN_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /getBrowserSupabase/, label: "getBrowserSupabase" },
  { re: /auth\.admin/, label: "auth.admin" },
  { re: /createServiceRoleClient|service_role|SERVICE_ROLE/, label: "service role client" },
  { re: /from ["']@\/[^"']+\.server["']/, label: "*.server.ts import in client" },
];

for (const rel of SECURITY_CLIENT_FILES) {
  const abs = path.join(ROOT, rel);
  assert.ok(fs.existsSync(abs), `missing security client file: ${rel}`);
  const src = fs.readFileSync(abs, "utf8");
  for (const { re, label } of FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(src, re, `${rel} must not use ${label}`);
  }
}

const dashboard = fs.readFileSync(path.join(ROOT, "components/dashboard/security-dashboard-view.tsx"), "utf8");
assert.match(dashboard, /SecurityMonitoringSection/);
assert.match(dashboard, /SecurityReleaseSection/);
assert.match(dashboard, /logSecurityPageAccessAction/);
assert.doesNotMatch(dashboard, /getBrowserSupabase/);

const monitoring = fs.readFileSync(
  path.join(ROOT, "components/dashboard/security/security-monitoring-section.tsx"),
  "utf8",
);
assert.match(monitoring, /listRecentSecurityAuditAction/);

const createModal = fs.readFileSync(path.join(ROOT, "components/dashboard/security-create-user-modal.tsx"), "utf8");
assert.match(createModal, /GestionaleModalShell/);

const resolveAuth = fs.readFileSync(path.join(ROOT, "src/lib/auth/resolve-server-auth.ts"), "utf8");
assert.match(resolveAuth, /isUserBanned/);

console.log("security-page-architecture-policy.test.ts OK");
