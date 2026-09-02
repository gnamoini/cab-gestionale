import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import type { MezzoMeteringFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";

export type MezzoUpdateFromSchedaPlan = {
  updateAnagrafica: boolean;
  fieldsToUpdate: MezzoPermanentFieldKey[];
  updateMetering: boolean;
  meteringFields: MezzoMeteringFieldKey[];
  forceDespiteStale?: boolean;
  mezzoOCC?: { updatedAtAtLinkTime: string };
  /** Utente ha confermato aggiornamento associazione (cliente/cantiere/utilizzatore). */
  associationChangeConfirmed?: boolean;
};

export const MEZZO_UPDATE_SCHEDA_ONLY: MezzoUpdateFromSchedaPlan = {
  updateAnagrafica: false,
  fieldsToUpdate: [],
  updateMetering: false,
  meteringFields: [],
};

export function mezzoUpdatePlanAllowsMezzoWrite(plan: MezzoUpdateFromSchedaPlan): boolean {
  return plan.updateAnagrafica || plan.updateMetering;
}

/** Nessuna scrittura mezzo/associazione — solo scheda + patch lavorazione. */
export function isMezzoUpdateSchedaOnly(plan: MezzoUpdateFromSchedaPlan | undefined): boolean {
  if (!plan) return true;
  return !mezzoUpdatePlanAllowsMezzoWrite(plan) && !plan.associationChangeConfirmed;
}
