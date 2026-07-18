export type CaptureSignatureBbox = {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
};

const INGRESSO_CAPTURE_MARKERS =
  /^(data_ingresso|descrizione_anomalia|addetto_accettazione|firma_|livello_carburante|utilizzatore|cantiere|tipo_attrezzatura|tipoattrezzatura|attrezzatura_marca|attrezzatura_modello|n_scuderia)/;

export function shouldExtractCaptureSignatures(
  schedaTipo?: string | null,
  fieldKeys?: readonly string[],
): boolean {
  const keys = fieldKeys?.map((k) => k.trim().toLowerCase()) ?? [];
  if (keys.some((k) => INGRESSO_CAPTURE_MARKERS.test(k))) return true;
  if (schedaTipo === "lavorazioni" || schedaTipo === "ricambi") return false;
  if (keys.some((k) => /^riga_\d+_/.test(k))) return false;
  return true;
}

export type CaptureSignatureFieldDraft = {
  field_key: string;
  raw_value: string;
  normalized_value: string;
  confidence: number;
};
