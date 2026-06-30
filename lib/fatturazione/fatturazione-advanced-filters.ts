import type { InvoiceStatus } from "@/src/types/supabase-tables";

export type FatturazioneScadenzaPreset = "all" | "oggi" | "settimana" | "mese" | "scadute";

export type FatturazioneAdvancedFilters = {
  status: InvoiceStatus | "";
  cliente: string;
  dataEmissioneFrom: string;
  dataEmissioneTo: string;
  scadenzaPreset: FatturazioneScadenzaPreset;
};

export const FATTURAZIONE_ADVANCED_FILTERS_EMPTY: FatturazioneAdvancedFilters = {
  status: "",
  cliente: "",
  dataEmissioneFrom: "",
  dataEmissioneTo: "",
  scadenzaPreset: "all",
};

export function fatturazioneAdvancedFiltersActive(f: FatturazioneAdvancedFilters): boolean {
  return Boolean(
    f.status ||
      f.cliente.trim() ||
      f.dataEmissioneFrom ||
      f.dataEmissioneTo ||
      (f.scadenzaPreset && f.scadenzaPreset !== "all"),
  );
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    bozza: "Bozza",
    da_verificare: "Da verificare",
    emessa: "Emessa",
    inviata: "Inviata",
    parzialmente_pagata: "Parz. pagata",
    pagata: "Pagata",
    scaduta: "Scaduta",
    annullata: "Annullata",
  };
  return map[status] ?? status;
}

function scadenzaRange(preset: FatturazioneScadenzaPreset, today: Date): { from: string | null; to: string | null; overdueOnly: boolean } {
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (preset === "oggi") {
    const s = ymd(t);
    return { from: s, to: s, overdueOnly: false };
  }
  if (preset === "settimana") {
    const end = new Date(t);
    end.setDate(end.getDate() + 7);
    return { from: ymd(t), to: ymd(end), overdueOnly: false };
  }
  if (preset === "mese") {
    const end = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    return { from: ymd(t), to: ymd(end), overdueOnly: false };
  }
  if (preset === "scadute") {
    return { from: null, to: ymd(t), overdueOnly: true };
  }
  return { from: null, to: null, overdueOnly: false };
}

export function invoiceMatchesAdvancedFilters(
  row: {
    status: InvoiceStatus;
    cliente_label: string;
    data_emissione: string;
    data_scadenza: string | null;
    residuo: number;
  },
  filters: FatturazioneAdvancedFilters,
  today = new Date(),
): boolean {
  if (filters.status && row.status !== filters.status) return false;
  if (filters.cliente.trim()) {
    const q = filters.cliente.trim().toLowerCase();
    if (!row.cliente_label.toLowerCase().includes(q)) return false;
  }
  if (filters.dataEmissioneFrom && row.data_emissione < filters.dataEmissioneFrom) return false;
  if (filters.dataEmissioneTo && row.data_emissione > filters.dataEmissioneTo) return false;
  const scad = scadenzaRange(filters.scadenzaPreset, today);
  if (scad.overdueOnly) {
    if (!(row.residuo > 0 && row.data_scadenza && row.data_scadenza < scadenzaRange("oggi", today).from!)) return false;
  } else if (scad.from || scad.to) {
    if (!row.data_scadenza) return false;
    if (scad.from && row.data_scadenza < scad.from) return false;
    if (scad.to && row.data_scadenza > scad.to) return false;
  }
  return true;
}
