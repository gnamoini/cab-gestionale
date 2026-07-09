import { FATTURAZIONE_HUB_PHASE } from "./fatturazione-hub-phase";

export type FatturazioneSectionId =
  | "fatture"
  | "scadenziario"
  | "pagamenti"
  | "note_credito"
  | "sdi"
  | "contabilita"
  | "iva"
  | "report"
  | "impostazioni";

export type FatturazioneSectionConfig = {
  id: FatturazioneSectionId;
  label: string;
  availableFromPhase: 1 | 2 | 3;
  order: number;
};

export const FATTURAZIONE_SECTIONS: readonly FatturazioneSectionConfig[] = [
  { id: "fatture", label: "Fatture", availableFromPhase: 1, order: 1 },
  { id: "scadenziario", label: "Scadenziario", availableFromPhase: 1, order: 2 },
  { id: "pagamenti", label: "Pagamenti", availableFromPhase: 1, order: 3 },
  { id: "note_credito", label: "Note di credito", availableFromPhase: 1, order: 4 },
  { id: "sdi", label: "Fatturazione elettronica", availableFromPhase: 2, order: 5 },
  { id: "iva", label: "IVA", availableFromPhase: 2, order: 6 },
  { id: "report", label: "Report", availableFromPhase: 2, order: 7 },
  { id: "contabilita", label: "Contabilità", availableFromPhase: 3, order: 8 },
  { id: "impostazioni", label: "Impostazioni", availableFromPhase: 3, order: 9 },
] as const;

export const FATTURAZIONE_DEFAULT_TAB: FatturazioneSectionId = "fatture";

export function fatturazioneSectionsForPhase(phase: 1 | 2 | 3 = FATTURAZIONE_HUB_PHASE): FatturazioneSectionConfig[] {
  return FATTURAZIONE_SECTIONS.filter((s) => s.availableFromPhase <= phase).sort((a, b) => a.order - b.order);
}

export function parseFatturazioneTab(
  raw: string | null | undefined,
  phase: 1 | 2 | 3 = FATTURAZIONE_HUB_PHASE,
): FatturazioneSectionId {
  const allowed = new Set(fatturazioneSectionsForPhase(phase).map((s) => s.id));
  if (raw && allowed.has(raw as FatturazioneSectionId)) return raw as FatturazioneSectionId;
  return FATTURAZIONE_DEFAULT_TAB;
}
