/** SSOT mapping entita → module (mirror rbac_log_entita_module). */

const ENTITA_MODULE_MAP: Record<string, string> = {
  lavorazioni: "lavorazioni",
  scheda_lavorazione: "lavorazioni",
  mezzi: "mezzi",
  attrezzature: "mezzi",
  magazzino_ricambi: "magazzino",
  movimenti_ricambi: "magazzino",
  preventivi: "preventivi",
  documenti: "documenti",
  invoices: "fatturazione",
  invoice_payments: "fatturazione",
  ddt_documents: "ddt",
  ordini_fornitori: "ordini_fornitori",
  dipendenti: "dipendenti",
  clienti_anagrafica: "clienti",
  maintenance_plans: "mezzi",
  vehicle_maintenance_configs: "mezzi",
  vehicle_maintenance_services: "mezzi",
  asset_compliance_rules: "mezzi",
  asset_compliance_records: "mezzi",
  asset_mileage_readings: "mezzi",
};

export function rbacLogEntitaModule(entita: string): string | null {
  return ENTITA_MODULE_MAP[entita] ?? null;
}
