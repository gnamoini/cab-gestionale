import type { DigitalDocument } from "@/lib/document-capture/model/document-model";
import type {
  InterpretationModel,
  InterventionCandidate,
} from "@/lib/document-capture/model/interpretation-model";
import type { ValidationResult } from "@/lib/document-capture/model/validation-result";

function readField(doc: DigitalDocument, key: string): string | null {
  for (const page of doc.pages) {
    for (const section of page.sections) {
      for (const f of section.fields) {
        if (f.key === key && f.value?.trim()) return f.value.trim();
      }
    }
  }
  return null;
}

function fingerprintFromDoc(doc: DigitalDocument): InterventionCandidate["fingerprint"] {
  return {
    cliente: readField(doc, "ingresso.cliente") ?? undefined,
    targa: readField(doc, "ingresso.targa") ?? undefined,
    matricola: readField(doc, "ingresso.matricola") ?? undefined,
    dataIngresso: readField(doc, "ingresso.data_ingresso") ?? undefined,
  };
}

/** Clustering pagine/sezioni — deduzioni dominio (non Validation). */
export function interpretDocument(
  document: DigitalDocument,
  validation: ValidationResult,
): InterpretationModel {
  const fp = fingerprintFromDoc(document);
  const fieldRefs: InterventionCandidate["fieldRefs"] = [];
  const pageRefs = new Set<number>();

  for (const page of document.pages) {
    for (const section of page.sections) {
      for (const f of section.fields) {
        if (f.value?.trim()) {
          fieldRefs.push({ key: f.key, pageIndex: page.index });
          pageRefs.add(page.index);
        }
      }
    }
  }

  const multipleSignals =
    validation.warnings.some((w) => w.code.includes("multiple")) ||
    validation.errors.some((e) => e.code.includes("multiple"));

  const candidates: InterventionCandidate[] = [
    {
      id: "intervention-1",
      fingerprint: fp,
      fieldRefs,
      pageRefs: [...pageRefs].sort((a, b) => a - b),
      confidence: multipleSignals ? 0.55 : 0.92,
    },
  ];

  const suggestedActions =
    multipleSignals || candidates.length > 1
      ? [{ type: "split" as const, message: "Possibili interventi multipli — confermare split" }]
      : [{ type: "create_new" as const, message: "Crea nuova lavorazione" }];

  return {
    interventionCandidates: candidates,
    semanticDuplicates: [],
    suggestedActions,
  };
}
