/**
 * ponytail: dominio separato da asset_compliance (revisioni/assicurazioni/calendario).
 * Qui: tagliandi operativi ore-based con piani centralizzati per tipo attrezzatura.
 */

export type MaintenancePlanStatus = {
  planId: string;
  planNome: string;
  intervalOre: number;
  ultimoOre: number | null;
  prossimoOre: number;
  oreMancanti: number;
};

export type MaintenancePlanPartView = {
  id: string;
  ricambioId: string;
  codice: string;
  descrizione: string;
  quantita: number;
};

export type MaintenancePlanView = {
  id: string;
  nome: string;
  intervalOre: number;
  isActive: boolean;
  tipoLabels: string[];
  tipoIds: string[];
  parts: MaintenancePlanPartView[];
};

export type MaintenanceServicePartView = {
  ricambioId: string;
  descrizione: string;
  quantita: number;
};

export type MaintenanceServiceHistoryView = {
  id: string;
  planId: string;
  planNome: string;
  performedAt: string;
  oreAtService: number;
  mezzoOreSnapshot: number | null;
  note: string;
  performedByName: string;
  parts: MaintenanceServicePartView[];
};

export type RegisterMaintenanceServiceInput = {
  mezzoId: string;
  planId: string;
  performedAt: string;
  oreAtService: number;
  mezzoOreSnapshot: number | null;
  note: string;
  parts: { ricambioId: string; quantita: number; descrizioneSnapshot?: string }[];
};

export type UpsertMaintenancePlanInput = {
  id?: string;
  nome: string;
  intervalOre: number;
  isActive: boolean;
  tipoAttrezzaturaIds: string[];
  parts: { ricambioId: string; quantita: number }[];
};
