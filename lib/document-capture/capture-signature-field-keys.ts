function normFieldKey(key: string): string {
  return key.trim().toLowerCase().replace(/^ingresso\./, "");
}

const CAPTURE_SIGNATURE_FIELD_KEYS = new Set([
  "firma_richiedente",
  "richiedente_firma",
  "firma_autista",
  "firma_addetto",
  "addetto_firma",
  "firma_addetto_officina",
]);

export function isCaptureSignatureFieldKey(fieldKey: string): boolean {
  return CAPTURE_SIGNATURE_FIELD_KEYS.has(normFieldKey(fieldKey));
}

export function captureSignatureFieldLabel(fieldKey: string): string | null {
  const key = normFieldKey(fieldKey);
  if (key.includes("addetto")) return "Firma addetto officina";
  if (key.includes("richiedente") || key.includes("autista")) return "Firma autista/richiedente";
  return null;
}
