import { createHash } from "node:crypto";
import type { DigitalDocument } from "@/lib/document-capture/model/document-model";

/** Hash canonico DocumentModel per INV-15 / INV-17. */
export function hashDocumentModelContent(doc: DigitalDocument): string {
  const canonical = {
    documentType: doc.documentType,
    completeness: doc.completeness,
    pages: doc.pages.map((p) => ({
      index: p.index,
      sections: p.sections.map((s) => ({
        sectionType: s.sectionType,
        fields: s.fields
          .map((f) => ({ key: f.key, value: f.value }))
          .sort((a, b) => a.key.localeCompare(b.key)),
      })),
    })),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function hashValidationResultPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function hashInterpretationModelPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
