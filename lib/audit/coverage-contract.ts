/**
 * SSOT audit coverage contract — CI verifica che ogni modulo/action abbia writer.
 */
export const auditCoverage = {
  mezzi: ["CREATE", "UPDATE", "DELETE"],
  lavorazioni: ["CREATE", "UPDATE", "DELETE", "CLOSE"],
  magazzino_ricambi: ["CREATE", "UPDATE", "DELETE"],
  movimenti_ricambi: ["CREATE"],
  preventivi: ["CREATE", "UPDATE", "DELETE", "APPROVE"],
  documenti: ["CREATE", "UPDATE", "DELETE"],
  schede: ["CREATE", "UPDATE", "DELETE"],
  invoices: ["CREATE", "UPDATE", "DELETE"],
  ddt_documents: ["CREATE", "UPDATE", "DELETE"],
  ordini_fornitori: ["CREATE", "UPDATE", "DELETE"],
  clienti_anagrafica: ["CREATE", "UPDATE", "DELETE"],
  attrezzature: ["CREATE", "UPDATE", "DELETE"],
  dipendenti: ["CREATE", "UPDATE", "DELETE"],
} as const;

export type AuditCoverageModule = keyof typeof auditCoverage;

export const AUDIT_COVERAGE_SERVICE_FILES: Record<AuditCoverageModule, string> = {
  mezzi: "src/services/mezzi.service.ts",
  lavorazioni: "src/services/lavorazioni.service.ts",
  magazzino_ricambi: "src/services/magazzino.service.ts",
  movimenti_ricambi: "src/services/movimenti.service.ts",
  preventivi: "src/services/preventivi.service.ts",
  documenti: "src/services/documenti.service.ts",
  schede: "src/services/schede.service.ts",
  invoices: "src/services/invoices.service.ts",
  ddt_documents: "src/services/ddt.service.ts",
  ordini_fornitori: "src/services/ordini-fornitori.service.ts",
  clienti_anagrafica: "src/services/clienti-anagrafica.service.ts",
  attrezzature: "src/services/attrezzature.service.ts",
  dipendenti: "src/services/dipendenti-timesheet.service.ts",
};
