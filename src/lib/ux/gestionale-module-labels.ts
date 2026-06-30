import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";

export const GESTIONALE_MODULE_LABELS: Record<GestionalePermissionModule, string> = {
  magazzino: "Magazzino",
  lavorazioni: "Lavorazioni",
  mezzi: "Mezzi",
  documenti: "Documenti",
  preventivi: "Preventivi",
  report: "Report",
  dipendenti: "Dipendenti",
  fatturazione: "Fatturazione",
  ddt: "Documenti di trasporto",
  ordini_fornitori: "Ordini fornitori",
};

export function gestionaleModuleLabel(module: GestionalePermissionModule): string {
  return GESTIONALE_MODULE_LABELS[module];
}
