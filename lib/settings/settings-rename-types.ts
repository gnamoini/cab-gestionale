/** Tipi di rinomina impostazioni da propagare ai record operativi. */
export type SettingsRenameKind =
  | "cliente"
  | "utilizzatore"
  | "cantiere"
  | "addetto"
  | "mag_marca"
  | "mag_categoria"
  | "mag_fornitore"
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
};

export type SettingsRenamePropagationResult = {
  kind: SettingsRenameKind;
  from: string;
  to: string;
  updated: number;
};
