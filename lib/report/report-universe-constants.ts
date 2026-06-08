/** Tabelle la cui cache alimenta useReportLiveData / ReportDataIntegrityLayer. */
export const REPORT_UNIVERSE_GESTIONALE_TABLES = [
  "lavorazioni",
  "magazzino_ricambi",
  "movimenti_ricambi",
  "mezzi",
  "app_settings",
] as const;

/** Tabelle rename settings che impattano metriche report. */
export function settingsRenameKindsAffectReport(kinds: readonly string[]): boolean {
  const reportKinds = new Set([
    "cliente",
    "utilizzatore",
    "cantiere",
    "addetto",
    "mag_marca",
    "mag_categoria",
    "mag_fornitore",
    "mag_produttore",
    "tipo_attrezzatura",
    "tipo_telaio",
    "hierarchy_marca_attrezzature",
    "hierarchy_modello_attrezzature",
    "hierarchy_marca_telai",
    "hierarchy_modello_telai",
  ]);
  return kinds.some((k) => reportKinds.has(k));
}
