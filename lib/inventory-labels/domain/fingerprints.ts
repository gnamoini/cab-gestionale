import { createHash } from "node:crypto";
import type { LabelPayload } from "@/lib/inventory-labels/domain/types";

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

export type LabelFingerprintInput = {
  payload: LabelPayload;
  templateId: string;
  templateVersion: string;
  generatorVersion: string;
  preset: string;
  includeBarcode?: boolean;
  labelKind?: "internal" | "cliente";
  clienteQrUrl?: string;
  canonicalOrigin: string;
};

export function computeLabelFingerprint(input: LabelFingerprintInput): string {
  const suppliers = (input.payload.fornitoriAlternativi ?? []).map((s) => ({
    name: s.name.trim(),
    code: (s.code ?? "").trim(),
  }));
  const canonical = canonicalizeJson({
    marca: input.payload.marca.trim(),
    marcaSecondaria: input.payload.marcaSecondaria.trim(),
    descrizione: input.payload.descrizione.trim(),
    codice: input.payload.codice.trim(),
    codiceSecondario: input.payload.codiceSecondario.trim(),
    fornitoriAlternativi: suppliers,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    generatorVersion: input.generatorVersion,
    preset: input.preset,
    includeBarcode: input.includeBarcode === true,
    labelKind: input.labelKind ?? "internal",
    clienteQrUrl: (input.clienteQrUrl ?? "").trim(),
    canonicalOrigin: input.canonicalOrigin.replace(/\/+$/, ""),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}
