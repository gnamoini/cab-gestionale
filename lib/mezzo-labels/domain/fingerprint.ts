import { createHash } from "node:crypto";
import { MEZZO_LABEL_TEMPLATE } from "@/lib/mezzo-labels/domain/template";
import type { MezzoLabelPayload } from "@/lib/mezzo-labels/domain/types";

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

export function computeMezzoLabelFingerprint(input: {
  payload: MezzoLabelPayload;
  qrToken: string;
  canonicalOrigin: string;
}): string {
  const canonical = canonicalizeJson({
    targa: input.payload.targa.trim(),
    numeroScuderia: (input.payload.numeroScuderia ?? "").trim(),
    templateVersion: MEZZO_LABEL_TEMPLATE.version,
    qrToken: input.qrToken.trim(),
    canonicalOrigin: input.canonicalOrigin.replace(/\/+$/, ""),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}
