export type CaptureSignatureBbox = {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
};

/** ponytail: disattivato — riattivare quando il crop firme da scansione è pronto */
export const CAPTURE_AI_SIGNATURE_EXTRACTION_ENABLED = false;

const INGRESSO_CAPTURE_MARKERS =
  /^(data_ingresso|descrizione_anomalia|addetto_accettazione|firma_|livello_carburante|utilizzatore|cantiere|tipo_attrezzatura|tipoattrezzatura|attrezzatura_marca|attrezzatura_modello|n_scuderia)/;

export function isCaptureAiSignatureExtractionEnabled(): boolean {
  return CAPTURE_AI_SIGNATURE_EXTRACTION_ENABLED;
}

export function shouldExtractCaptureSignatures(
  schedaTipo?: string | null,
  fieldKeys?: readonly string[],
): boolean {
  if (!CAPTURE_AI_SIGNATURE_EXTRACTION_ENABLED) return false;
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

/** Espande bbox normalizzata (0–1000) per tolleranza foto leggermente fuori allineamento. */
export function padCaptureSignatureBbox(
  bbox: CaptureSignatureBbox,
  pad = 14,
): CaptureSignatureBbox {
  return {
    xmin: Math.max(0, bbox.xmin - pad),
    ymin: Math.max(0, bbox.ymin - pad),
    xmax: Math.min(1000, bbox.xmax + pad),
    ymax: Math.min(1000, bbox.ymax + pad),
  };
}
