/** Chiave mese `YYYY-MM`. */
export type TimesheetMonthKey = string;

export type DipendenteTimesheetEmployeeRow = {
  id: string;
  display_name: string;
  source_addetto_name: string | null;
  source_addetto_id: string | null;
  in_settings: boolean;
  employee_type: "ADDETTO" | "ALTRO";
  attivo: boolean;
  created_at: string;
  updated_at: string;
};

export type DipendenteTimesheetEntryRow = {
  id: string;
  dipendente_id: string;
  work_date: string;
  ore_ordinarie: number;
  ore_straordinarie: number;
  /** @deprecated Legacy boolean; preferire ore_assenza. */
  assenza: boolean;
  /** @deprecated Legacy; preferire tipo_assenza_label + motivoCustom. */
  motivo_assenza: string | null;
  ore_assenza: number;
  note: string | null;
  tipo_assenza_id: string | null;
  tipo_assenza_label: string | null;
  /** Snapshot nome dipendente al save (indipendente da rename). */
  employee_display_name_snapshot: string;
  /** Snapshot id addetto da settings al save. */
  employee_source_addetto_id_snapshot: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TimesheetCellValue = {
  oreOrdinarie: number;
  oreStraordinarie: number;
  oreAssenza: number;
  tipoAssenzaId: string | null;
  tipoAssenzaLabel: string;
  motivoCustom: string;
  note: string;
};

export type TimesheetEntryUpsert = {
  dipendenteId: string;
  workDate: string;
  oreOrdinarie: number;
  oreStraordinarie: number;
  oreAssenza: number;
  tipoAssenzaId?: string | null;
  tipoAssenzaLabel?: string | null;
  motivoCustom?: string | null;
  note?: string | null;
};

export type TimesheetMonthTotals = {
  oreOrdinarie: number;
  oreStraordinarie: number;
  oreAssenza: number;
  totaleLavorato: number;
  giorniAssenza: number;
};

export type TimesheetEditorTarget = {
  dipendenteId: string;
  workDate: string;
};
