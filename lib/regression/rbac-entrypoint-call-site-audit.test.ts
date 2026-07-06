/**
 * P0 gate: AST audit — no runtime service imports from UI/hooks (fail-open protection).
 */
import assert from "node:assert/strict";
import { auditEntrypointCallSites, CALL_SITE_AUDIT_ALLOWLIST } from "./rbac-entrypoint-call-site-audit";

const violations = auditEntrypointCallSites(CALL_SITE_AUDIT_ALLOWLIST);

assert.equal(
  violations.length,
  0,
  `rbac-entrypoint-call-site-audit failed (${violations.length}):\n${violations.join("\n")}`,
);

console.log("rbac-entrypoint-call-site-audit.test.ts OK");
