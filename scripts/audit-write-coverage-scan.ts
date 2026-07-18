/**
 * Scansiona path write noti con log UI e verifica presenza writeModificaLog o allowlist.
 * Exit 1 se gap non documentato.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** File con log UI che devono chiamare writeModificaLog (o eccezione documentata). */
const LOG_UI_WRITE_PATHS: { file: string; allowNoAudit?: boolean; reason?: string }[] = [
  { file: "src/services/lavorazioni.service.ts" },
  { file: "src/services/magazzino.service.ts" },
  { file: "src/services/movimenti.service.ts" },
  { file: "src/services/mezzi.service.ts" },
  { file: "src/services/preventivi.service.ts" },
  { file: "src/services/invoices.service.ts" },
  { file: "src/services/ddt.service.ts" },
  { file: "src/services/documenti.service.ts" },
  { file: "src/services/ordini-fornitori.service.ts" },
  { file: "src/services/schede.service.ts" },
  { file: "lib/document-capture/capture-intervento-write-deps.server.ts" },
  { file: "lib/magazzino/listino-import/listino-import-execute.server.ts" },
  { file: "lib/data-import/entities/magazzino/magazzino-import-execute.server.ts" },
  { file: "lib/data-import/entities/preventivi/preventivi-import.plugin.server.ts" },
  { file: "src/services/settings-rename-propagation.service.ts" },
  { file: "src/actions/admin-users.ts", allowNoAudit: true, reason: "direct log_modifiche insert + security" },
  { file: "lib/security/security-audit-log.ts", allowNoAudit: true, reason: "writeSecurityAuditLog parallel path" },
];

function read(rel: string): string {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return "";
  return fs.readFileSync(abs, "utf8");
}

const gaps: string[] = [];

for (const entry of LOG_UI_WRITE_PATHS) {
  const content = read(entry.file);
  if (!content) {
    gaps.push(`${entry.file}: file mancante`);
    continue;
  }
  if (entry.allowNoAudit) continue;
  const hasAudit =
    /writeModificaLog/.test(content) ||
    /writeSecurityAuditLog/.test(content) ||
    /\.from\(\s*["']log_modifiche["']\s*\)[\s\S]*?\.insert/.test(content);
  if (!hasAudit) {
    gaps.push(`${entry.file}: nessun writeModificaLog`);
  }
}

if (gaps.length > 0) {
  console.error("audit-write-coverage-scan: GAP trovati:\n" + gaps.map((g) => `  - ${g}`).join("\n"));
  process.exit(1);
}

console.log(`audit-write-coverage-scan: OK (${LOG_UI_WRITE_PATHS.length} path verificati)`);
