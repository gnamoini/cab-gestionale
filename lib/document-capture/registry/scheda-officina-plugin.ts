import { interpretDocument } from "@/lib/document-capture/domain/document-domain-service";
import { detectSemanticDuplicates } from "@/lib/document-capture/domain/duplicate-detection-service";
import {
  projectExtractionToDocumentModel,
  createEmptyDocumentModel,
} from "@/lib/document-capture/extraction/schema-projector";
import type { ApplyPlanV41 } from "@/lib/document-capture/model/apply-plan-v41";
import type { DigitalDocument } from "@/lib/document-capture/model/document-model";
import {
  hashDocumentModelContent,
  hashInterpretationModelPayload,
  hashValidationResultPayload,
} from "@/lib/document-capture/model/document-model-hash";
import type { ExtractionResult } from "@/lib/document-capture/model/extraction-result";
import type { InterpretationModel } from "@/lib/document-capture/model/interpretation-model";
import type { ValidationResult } from "@/lib/document-capture/model/validation-result";
import {
  PROJECTOR_VERSION,
  SCHEDA_OFFICINA_RULE_SET_VERSION,
  VALIDATION_ENGINE_VERSION,
} from "@/lib/document-capture/model/versions";
import { parsePhysicalPages } from "@/lib/document-capture/physical/physical-parser";
import {
  registerDocumentTypePlugin,
  type DocumentTypePlugin,
} from "@/lib/document-capture/registry/document-type-registry";
import { schedaOfficinaPromptContract } from "@/lib/document-capture/registry/prompt-contract";
import { runValidationEngine } from "@/lib/document-capture/rules/validation-engine";
import { schedaOfficinaBundleRules } from "@/lib/document-capture/rules/scheda-officina-bundle";

async function stubExtraction(): Promise<ExtractionResult> {
  throw new Error("runExtraction delegato ad analyze-capture-v41.server");
}

export const schedaOfficinaPlugin: DocumentTypePlugin = {
  id: "scheda_officina_bundle",
  capabilities: {
    supportsMultipage: true,
    supportsMultipleInterventions: false,
    supportsOCR: true,
    supportsAttachments: false,
    supportsPageRotation: true,
    maxPages: 50,
    maxBytes: 25 * 1024 * 1024,
  },
  ruleSetId: SCHEDA_OFFICINA_RULE_SET_VERSION,
  promptContract: schedaOfficinaPromptContract,
  runPhysicalParse: parsePhysicalPages,
  runExtraction: stubExtraction,
  projectToModel: (input) =>
    projectExtractionToDocumentModel({
      captureId: input.captureId,
      documentType: "scheda_officina_bundle",
      pageObjects: input.pageObjects,
      extraction: input.extraction,
      updatedBy: input.updatedBy,
    }),
  validate: (document) => runValidationEngine(document, schedaOfficinaBundleRules),
  interpret: (document, validation) => interpretDocument(document, validation),
  buildApplyPlan: (input) => {
    const validationHash = hashValidationResultPayload(input.validation);
    const interpretationHash = hashInterpretationModelPayload(input.interpretation);
    const documentModelVersionHash = hashDocumentModelContent(input.document);
    return {
      sourceValidationHash: validationHash,
      sourceInterpretationHash: interpretationHash,
      documentModelVersionHash,
      ruleSetVersion: SCHEDA_OFFICINA_RULE_SET_VERSION,
      validationEngineVersion: VALIDATION_ENGINE_VERSION,
      projectorVersion: PROJECTOR_VERSION,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      operations: input.interpretation.interventionCandidates.map((c) => ({
        kind: "create_intervention" as const,
        interventionCandidateId: c.id,
      })),
      approvedCreates: {
        mezzo: true,
        lavorazioniScheda: true,
        ricambiScheda: true,
      },
    } satisfies ApplyPlanV41;
  },
};

let registered = false;

export function ensureSchedaOfficinaPluginRegistered(): DocumentTypePlugin {
  if (!registered) {
    registerDocumentTypePlugin(schedaOfficinaPlugin);
    registered = true;
  }
  return schedaOfficinaPlugin;
}

export function buildEmptySchedaDocument(input: {
  captureId: string;
  pageObjects: Awaited<ReturnType<typeof parsePhysicalPages>>;
  updatedBy: string;
}): DigitalDocument {
  return createEmptyDocumentModel({
    captureId: input.captureId,
    documentType: "scheda_officina_bundle",
    pageObjects: input.pageObjects,
    updatedBy: input.updatedBy,
  });
}

export function runSchedaPipelineViews(document: DigitalDocument): {
  validation: ValidationResult;
  interpretation: InterpretationModel;
} {
  const plugin = ensureSchedaOfficinaPluginRegistered();
  const validation = plugin.validate(document);
  const interpretation = detectSemanticDuplicates(plugin.interpret(document, validation), []);
  return { validation, interpretation };
}
