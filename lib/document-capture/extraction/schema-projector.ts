import type { DigitalDocument, DocumentField, Page } from "@/lib/document-capture/model/document-model";
import type { ExtractionResult } from "@/lib/document-capture/model/extraction-result";
import {
  DOCUMENT_MODEL_SCHEMA_VERSION,
  DOCUMENT_MODEL_VERSION,
  PROJECTOR_VERSION,
} from "@/lib/document-capture/model/versions";
import { hashDocumentModelContent } from "@/lib/document-capture/model/document-model-hash";
import type { PageObject } from "@/lib/document-capture/model/page-object";

/** Mapping-only projector — zero deduzioni (INV-05). */

function inferSectionType(key: string): string {
  if (key.startsWith("ingresso.")) return "ingresso";
  if (key.startsWith("lav.")) return "lavorazioni";
  if (key.startsWith("ric.")) return "ricambi";
  if (key.startsWith("ingresso_") || key === "cliente" || key === "data_ingresso") return "ingresso";
  if (key.includes("lavorazione") || key.startsWith("riga_") && key.includes("_lavorazione")) return "lavorazioni";
  if (key.includes("codice") || key.includes("ricambio")) return "ricambi";
  return "unknown";
}

function namespaceKey(rawKey: string): string {
  const k = rawKey.trim().toLowerCase();
  if (k.startsWith("ingresso.") || k.startsWith("lav.") || k.startsWith("ric.")) return k;
  if (["cliente", "data_ingresso", "targa", "matricola", "km", "descrizione_anomalia"].includes(k)) {
    return `ingresso.${k}`;
  }
  if (k.startsWith("riga_") && (k.includes("_lavorazione") || k.includes("_ore"))) {
    return `lav.${k}`;
  }
  if (k.startsWith("riga_")) return `ric.${k}`;
  return `ingresso.${k}`;
}

export function projectExtractionToDocumentModel(input: {
  captureId: string;
  documentType: string;
  pageObjects: readonly PageObject[];
  extraction: ExtractionResult;
  updatedBy: string;
}): DigitalDocument {
  const pageMap = new Map<number, Page>();

  for (const po of input.pageObjects) {
    pageMap.set(po.index, {
      index: po.index,
      physical: {
        rotation: po.rotation,
        isEmpty: po.isEmpty,
        isDuplicateOf: po.isDuplicateOf,
        byteSize: po.byteSize,
      },
      classification: input.extraction.pageClassifications?.[po.index],
      sections: [],
    });
  }

  const sectionFields = new Map<string, Map<string, DocumentField>>();

  for (const ef of input.extraction.fields) {
    const key = namespaceKey(ef.key);
    const sectionType = inferSectionType(key);
    if (!sectionFields.has(sectionType)) sectionFields.set(sectionType, new Map());
    sectionFields.get(sectionType)!.set(key, {
      key,
      value: ef.value,
      confidence: ef.confidence,
      provenance: {
        source: "ai",
        pageIndex: ef.pageIndex,
        attemptId: input.extraction.attemptId,
        promptVersion: input.extraction.modelMetadata.promptVersion,
        schemaVersion: input.extraction.outputSchemaVersion,
        manuallyEdited: false,
      },
    });

    if (!pageMap.has(ef.pageIndex) && input.pageObjects.length > 0) {
      const po = input.pageObjects[0]!;
      pageMap.set(ef.pageIndex, {
        index: ef.pageIndex,
        physical: { isEmpty: false, byteSize: po.byteSize },
        sections: [],
      });
    }
  }

  for (const [sectionType, fields] of sectionFields) {
    const pageIndex = [...fields.values()][0]?.provenance.pageIndex ?? 0;
    let page = pageMap.get(pageIndex);
    if (!page) {
      page = { index: pageIndex, physical: { isEmpty: false }, sections: [] };
      pageMap.set(pageIndex, page);
    }
    page.sections.push({
      sectionType,
      fields: [...fields.values()],
    });
  }

  const pages = [...pageMap.values()].sort((a, b) => a.index - b.index);
  const hasIngresso = pages.some((p) => p.sections.some((s) => s.sectionType === "ingresso"));
  const hasLav = pages.some((p) => p.sections.some((s) => s.sectionType === "lavorazioni"));
  const hasRic = pages.some((p) => p.sections.some((s) => s.sectionType === "ricambi"));
  const completeness =
    hasIngresso && hasLav && hasRic ? "complete" : hasIngresso || hasLav || hasRic ? "partial" : "unknown";

  const doc: DigitalDocument = {
    id: input.captureId,
    documentType: input.documentType,
    completeness,
    pages,
    metadata: {
      schemaVersion: DOCUMENT_MODEL_SCHEMA_VERSION,
      migrationVersion: "1",
      documentModelVersion: DOCUMENT_MODEL_VERSION,
      updatedAt: new Date().toISOString(),
      updatedBy: input.updatedBy,
      contentHash: "",
    },
  };
  doc.metadata.contentHash = hashDocumentModelContent(doc);
  void PROJECTOR_VERSION;
  return doc;
}

export function createEmptyDocumentModel(input: {
  captureId: string;
  documentType: string;
  pageObjects: readonly PageObject[];
  updatedBy: string;
}): DigitalDocument {
  const pages: Page[] = input.pageObjects.map((po) => ({
    index: po.index,
    physical: {
      rotation: po.rotation,
      isEmpty: po.isEmpty,
      isDuplicateOf: po.isDuplicateOf,
      byteSize: po.byteSize,
    },
    sections: [],
  }));
  const doc: DigitalDocument = {
    id: input.captureId,
    documentType: input.documentType,
    completeness: "unknown",
    pages,
    metadata: {
      schemaVersion: DOCUMENT_MODEL_SCHEMA_VERSION,
      migrationVersion: "1",
      documentModelVersion: DOCUMENT_MODEL_VERSION,
      updatedAt: new Date().toISOString(),
      updatedBy: input.updatedBy,
      contentHash: "",
    },
  };
  doc.metadata.contentHash = hashDocumentModelContent(doc);
  return doc;
}
