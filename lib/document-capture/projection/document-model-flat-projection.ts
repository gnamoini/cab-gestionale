import type { DigitalDocument } from "@/lib/document-capture/model/document-model";

/** Flat projection — mapping-only, zero business logic (INV-08). */

export type FlatCaptureField = {
  fieldKey: string;
  value: string | null;
  confidence: number;
  pageIndex?: number;
};

export function projectDocumentModelToFlatFields(document: DigitalDocument): FlatCaptureField[] {
  const out: FlatCaptureField[] = [];
  for (const page of document.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        const legacyKey = field.key.includes(".") ? field.key.split(".").slice(1).join(".") : field.key;
        out.push({
          fieldKey: legacyKey,
          value: field.value,
          confidence: field.confidence,
          pageIndex: field.provenance.pageIndex,
        });
      }
    }
  }
  return out;
}
