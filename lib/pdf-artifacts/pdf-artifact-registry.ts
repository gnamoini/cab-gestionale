import { createHash } from "node:crypto";

export const PDF_ARTIFACT_TYPES = [
  "lavorazioni-in-corso",
  "report-bundle",
  "scheda-ingresso",
  "scheda-lavorazioni",
  "scheda-ricambi",
  "preventivo",
  "fattura",
  "ddt",
  "ordine-fornitore",
  "dipendenti-aziendale",
  "dipendenti-dipendente",
] as const;

export type PdfArtifactType = (typeof PDF_ARTIFACT_TYPES)[number];

export function isPdfArtifactType(value: string): value is PdfArtifactType {
  return (PDF_ARTIFACT_TYPES as readonly string[]).includes(value);
}

/** Serializzazione canonica per hash deterministici. */
export function stableHashPayload(payload: unknown): string {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalizeJson(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`).join(",")}}`;
}
