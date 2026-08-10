import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const security = fs.readFileSync(
  path.join(ROOT, "components/dashboard/security/security-monitoring-section.tsx"),
  "utf8",
);

assert.match(security, /listRecentSecurityAuditAction/);
assert.match(security, /Ultimi login/);
assert.match(security, /Ultime azioni \/ modifiche/);
assert.doesNotMatch(security, /auth_logs[\s\S]*log_modifiche|log_modifiche[\s\S]*auth_logs/);

console.log("security-log-timeline-separation.test.ts OK");
