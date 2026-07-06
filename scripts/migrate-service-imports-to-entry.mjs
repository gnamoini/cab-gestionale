/**
 * Codemod: service imports → *-entry in hooks/components
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REPLACEMENTS = [
  ["@/src/services/magazzino.service", "@/lib/domain/magazzino-entry", "magazzinoService", "magazzinoEntry"],
  ["@/src/services/documenti.service", "@/lib/domain/documenti-entry", "documentiService", "documentiEntry"],
  ["@/src/services/movimenti.service", "@/lib/domain/movimenti-entry", "movimentiService", "movimentiEntry"],
  ["@/src/services/schede.service", "@/lib/domain/schede-entry", "schedeService", "schedeEntry"],
  ["@/src/services/log.service", "@/lib/domain/log-entry", "logService", "logEntry"],
  ["@/src/services/mezzi.service", "@/lib/domain/mezzi-entry", "mezziService", "mezziEntry"],
  ["@/src/services/lavorazione-documents.service", "@/lib/domain/lavorazione-documents-entry", "lavorazioneDocumentsService", "lavorazioneDocumentsEntry"],
  ["@/src/services/settings.service", "@/lib/domain/settings-entry", "settingsService", "settingsEntry"],
  ["@/src/services/settings-rename-propagation.service", "@/lib/domain/settings-rename-propagation-entry", "settingsRenamePropagationService", "settingsRenamePropagationEntry"],
  ["@/src/services/ddt.service", "@/lib/domain/ddt-entry", "ddtService", "ddtEntry"],
  ["@/src/services/invoices.service", "@/lib/domain/invoices-entry", "invoicesService", "invoicesEntry"],
  ["@/src/services/preventivi.service", "@/lib/domain/preventivi-entry", "preventiviService", "preventiviEntry"],
  ["@/src/services/workshop-schedule.service", "@/lib/domain/workshop-schedule-entry", "workshopScheduleService", "workshopScheduleEntry"],
  ["@/src/services/clienti-anagrafica.service", "@/lib/domain/clienti-anagrafica-entry", "clientiAnagraficaService", "clientiAnagraficaEntry"],
  ["@/src/services/attrezzature.service", "@/lib/domain/attrezzature-entry", "attrezzatureService", "attrezzatureEntry"],
  ["@/src/services/ordini-fornitori.service", "@/lib/domain/ordini-fornitori-entry", "ordiniFornitoriService", "ordiniFornitoriEntry"],
  ["@/src/services/client-lavorazioni.service", "@/lib/domain/client-lavorazioni-entry", "clientLavorazioniService", "clientLavorazioniEntry"],
  ["@/src/services/app-settings-audit.service", "@/lib/domain/app-settings-audit-entry", "appSettingsAuditService", "appSettingsAuditEntry"],
  ["@/src/services/asset-compliance.service", "@/lib/domain/asset-compliance-entry", "assetComplianceService", "assetComplianceEntry"],
  ["@/src/services/asset-timeline.service", "@/lib/domain/asset-timeline-entry", "assetTimelineService", "assetTimelineEntry"],
  ["@/src/services/dashboard-promemoria.service", "@/lib/domain/dashboard-promemoria-entry", "dashboardPromemoriaService", "dashboardPromemoriaEntry"],
  ["@/src/services/dipendenti-timesheet.service", "@/lib/domain/dipendenti-timesheet-entry", "dipendentiTimesheetService", "dipendentiTimesheetEntry"],
  ["@/src/services/notifications.service", "@/lib/domain/notifications-entry", "notificationsService", "notificationsEntry"],
  ["@/src/services/permissions.service", "@/lib/domain/permissions-entry", "permissionsService", "permissionsEntry"],
  ["@/src/services/auth-logs.service", "@/lib/domain/auth-logs-entry", "authLogsService", "authLogsEntry"],
  ["@/src/services/report-manual-entries.service", "@/lib/domain/report-manual-entries-entry", "reportManualEntriesService", "reportManualEntriesEntry"],
  ["@/src/services/user-prefs.service", "@/lib/domain/user-prefs-entry", "userPrefsService", "userPrefsEntry"],
];

const SCAN = ["components", "src/hooks", "context"];
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.(ts|tsx)$/.test(e.name)) out.push(f);
  }
}
const files = [];
for (const d of SCAN) {
  const abs = path.join(ROOT, d);
  if (fs.existsSync(abs)) walk(abs, files);
}
let changed = 0;
for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  let next = src;
  for (const [from, to, oldName, newName] of REPLACEMENTS) {
    next = next.split(from).join(to);
    next = next.split(oldName).join(newName);
  }
  if (next !== src) {
    fs.writeFileSync(file, next);
    changed++;
  }
}
console.log(`migrate-service-imports: ${changed} files`);
