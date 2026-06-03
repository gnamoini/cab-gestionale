import type { LavorazioneDocumentRow, LavorazioneDocumentTipo } from "@/src/types/supabase-tables";

export const LAVORAZIONE_DOCUMENT_SLOTS: {
  tipo: LavorazioneDocumentTipo;
  label: string;
  uploadLabel: string;
}[] = [
  { tipo: "preventivo_upload", label: "Preventivo ufficiale", uploadLabel: "Carica preventivo ufficiale" },
  { tipo: "ddt", label: "DDT", uploadLabel: "Carica DDT" },
];

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

export function isPdfFile(file: File): boolean {
  const t = file.type.trim().toLowerCase();
  if (t === "application/pdf") return true;
  return file.name.trim().toLowerCase().endsWith(".pdf");
}

/** Verifica magic bytes %PDF- (mitiga upload con estensione spoofata). */
export async function fileHasPdfMagicBytes(file: File): Promise<boolean> {
  if (file.size < PDF_MAGIC.length) return false;
  const buf = await file.slice(0, PDF_MAGIC.length).arrayBuffer();
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < PDF_MAGIC.length; i += 1) {
    if (bytes[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
}

export async function isValidPdfFile(file: File): Promise<boolean> {
  if (!isPdfFile(file)) return false;
  return fileHasPdfMagicBytes(file);
}

export function lavorazioneDocumentByTipo(
  rows: readonly LavorazioneDocumentRow[],
  tipo: LavorazioneDocumentTipo,
): LavorazioneDocumentRow | undefined {
  return rows.find((r) => r.tipo === tipo);
}
