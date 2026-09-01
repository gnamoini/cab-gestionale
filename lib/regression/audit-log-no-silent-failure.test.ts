import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const auditLog = fs.readFileSync(path.join(ROOT, "src/services/internal/audit-log.ts"), "utf8");
const auditRecord = fs.readFileSync(path.join(ROOT, "lib/audit/record.ts"), "utf8");
const batcher = fs.readFileSync(path.join(ROOT, "src/services/internal/log-modifiche-batcher.ts"), "utf8");

assert.doesNotMatch(auditLog, /autore_id assente, log saltato/);
assert.match(auditLog, /AuditLogWriteError/);
assert.match(auditRecord, /throw new AuditLogWriteError/);
assert.match(auditLog, /commitCriticalMutation/);
assert.match(auditLog, /const flushModificaLog[\s\S]*?\) => writeModificaLogImmediate\(item\.client, item\)/);
assert.match(auditLog, /registerModificaLogPageLifecycleFlush\(\(item\) => safeWriteModificaLogImmediate/);

assert.doesNotMatch(batcher, /\.catch\(\(\)\s*=>\s*\{\s*\/\* errori gestiti/);

console.log("audit-log-no-silent-failure.test: OK");
