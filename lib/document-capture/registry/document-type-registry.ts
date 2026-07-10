import { z } from "zod";
import type { PageObject } from "@/lib/document-capture/model/page-object";
import type { ExtractionResult } from "@/lib/document-capture/model/extraction-result";
import type { DigitalDocument } from "@/lib/document-capture/model/document-model";
import type { ValidationResult } from "@/lib/document-capture/model/validation-result";
import type { InterpretationModel } from "@/lib/document-capture/model/interpretation-model";
import type { ApplyPlanV41 } from "@/lib/document-capture/model/apply-plan-v41";

export type DocumentTypeCapabilities = {
  supportsMultipage: boolean;
  supportsMultipleInterventions: boolean;
  supportsOCR: boolean;
  supportsAttachments: boolean;
  supportsPageRotation: boolean;
  maxPages?: number;
  maxBytes?: number;
};

export type PromptContract = {
  id: string;
  version: string;
  documentType: string;
  expectedModelId: string;
  inputLimits: {
    maxPages: number;
    maxBytes: number;
    maxEstimatedTokens?: number;
  };
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number[];
    retryableErrors: string[];
  };
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchemaVersion: string;
  projectorVersion: string;
  active: boolean;
};

export const promptOutputSchema = z.object({
  fields: z.record(
    z.string(),
    z.object({
      value: z.string().nullable(),
      confidence: z.number().min(0).max(1),
      pageIndex: z.number().int().min(0),
    }),
  ),
});

export type DocumentTypePlugin = {
  id: string;
  capabilities: DocumentTypeCapabilities;
  ruleSetId: string;
  promptContract: PromptContract;
  runPhysicalParse: (pdfBytes: Uint8Array) => Promise<PageObject[]>;
  runExtraction: (pages: PageObject[], contract: PromptContract) => Promise<ExtractionResult>;
  projectToModel: (input: {
    captureId: string;
    pageObjects: PageObject[];
    extraction: ExtractionResult;
    updatedBy: string;
  }) => DigitalDocument;
  validate: (document: DigitalDocument) => ValidationResult;
  interpret: (document: DigitalDocument, validation: ValidationResult) => InterpretationModel;
  buildApplyPlan: (input: {
    document: DigitalDocument;
    validation: ValidationResult;
    interpretation: InterpretationModel;
    createdBy: string;
  }) => ApplyPlanV41;
};

const plugins = new Map<string, DocumentTypePlugin>();

export function registerDocumentTypePlugin(plugin: DocumentTypePlugin): void {
  plugins.set(plugin.id, plugin);
}

export function getDocumentTypePlugin(id: string): DocumentTypePlugin | undefined {
  return plugins.get(id);
}

export function listDocumentTypePlugins(): DocumentTypePlugin[] {
  return [...plugins.values()];
}
