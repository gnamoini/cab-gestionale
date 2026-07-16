export type CaptureSignatureBbox = {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
};

const INGRESSO_CAPTURE_MARKERS =
  /^(cliente|data_ingresso|targa|matricola|descrizione_anomalia|richiedente|addetto_accettazione|firma_)/;

export function shouldExtractCaptureSignatures(
  schedaTipo?: string | null,
  fieldKeys?: readonly string[],
): boolean {
  if (schedaTipo === "lavorazioni" || schedaTipo === "ricambi") return false;
  const keys = fieldKeys?.map((k) => k.trim().toLowerCase()) ?? [];
  if (keys.some((k) => INGRESSO_CAPTURE_MARKERS.test(k))) return true;
  if (keys.some((k) => /^riga_\d+_/.test(k))) return false;
  return true;
}

export type CaptureSignatureFieldDraft = {
  field_key: string;
  raw_value: string;
  normalized_value: string;
  confidence: number;
};
