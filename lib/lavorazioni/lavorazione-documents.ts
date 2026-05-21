import type { LavorazioneDocumentRow, LavorazioneDocumentTipo } from "@/src/types/supabase-tables";

export const LAVORAZIONE_DOCUMENT_SLOTS: {
  tipo: LavorazioneDocumentTipo;
  label: string;
  uploadLabel: string;
}[] = [
  { tipo: "preventivo_upload", label: "Preventivo ufficiale", uploadLabel: "Carica preventivo ufficiale" },
  { tipo: "ddt", label: "DDT", uploadLabel: "Carica DDT" },
];

export function isPdfFile(file: File): boolean {
  const t = file.type.trim().toLowerCase();
  if (t === "application/pdf") return true;
  return file.name.trim().toLowerCase().endsWith(".pdf");
}

export function lavorazioneDocumentByTipo(
  rows: readonly LavorazioneDocumentRow[],
  tipo: LavorazioneDocumentTipo,
): LavorazioneDocumentRow | undefined {
  return rows.find((r) => r.tipo === tipo);
}
