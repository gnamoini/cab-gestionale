import { hasSignatureDataUrl } from "@/lib/media/signature-pad";

function normFieldKey(key: string): string {
  return key.trim().toLowerCase().replace(/^ingresso\./, "");
}

/** Prefer data URL from any capture column (confirmed OCR text must not win over PNG). */
export function pickCaptureSignatureDataUrl(
  ...values: Array<string | null | undefined>
): string {
  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (hasSignatureDataUrl(trimmed)) return trimmed;
  }
  return "";
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
