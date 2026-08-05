import type { HierarchyTreeKey } from "@/lib/mezzi/hierarchy-list-prefs";

/** Tipi di rinomina impostazioni da propagare ai record operativi. */
export type SettingsRenameKind =
  | "cliente"
  | "utilizzatore"
  | "cantiere"
  | "addetto"
  | "mag_marca"
  | "mag_categoria"
  | "mag_fornitore"
  | "mag_produttore"
  | "tipo_attrezzatura"
  | "tipo_telaio"
  | "hierarchy_marca_attrezzature"
  | "hierarchy_modello_attrezzature"
  | "hierarchy_marca_telai"
  | "hierarchy_modello_telai";

export type SettingsRenameEntry = {
  kind: SettingsRenameKind;
  from: string;
  to: string;
  /** Catalogo prima della rinomina (collision guard + drift). */
  catalogBeforeRename?: readonly string[];
  /** Alias storici in scheda (es. «nome cognome» oltre alla chiave `nome`). */
  fromAliases?: readonly string[];
  /** Marca parent per rename modello (evita ambiguità). */
  marcaContext?: string;
  tree?: HierarchyTreeKey;
};

export type SettingsRenamePropagationResult = {
  kind: SettingsRenameKind;
  from: string;
  to: string;
  updated: number;
  table?: string;
  operationId?: string;
};
