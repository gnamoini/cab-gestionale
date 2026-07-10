import type { BoundingBox } from "@/lib/document-capture/model/provenance";
import type { PageClassification } from "@/lib/document-capture/model/document-model";

export type ExtractionField = {
  key: string;
  value: string | null;
  confidence: number;
  pageIndex: number;
  boundingBox?: BoundingBox;
};

export type AIAttemptMetadata = {
  modelId: string;
  promptContractId: string;
  promptVersion: string;
  outputSchemaVersion: string;
  projectorVersion: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  retryCount?: number;
  finishReason?: string;
  meanConfidence?: number;
  pageCount?: number;
};

export type ExtractionResult = {
  attemptId: string;
  promptContractId: string;
  outputSchemaVersion: string;
  fields: ExtractionField[];
  pageClassifications?: PageClassification[];
  modelMetadata: AIAttemptMetadata;
};
