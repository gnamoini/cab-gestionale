/** Versioni SSOT — INV-15, INV-16. */

export const DOCUMENT_MODEL_SCHEMA_VERSION = "1.0";
export const DOCUMENT_MODEL_VERSION = "1.0.0";
export const VALIDATION_ENGINE_VERSION = "1.0.0";
export const SCHEDA_OFFICINA_RULE_SET_VERSION = "1.0.0";
export const PROJECTOR_VERSION = "1.0.0";

export type DocumentModelMetadata = {
  schemaVersion: string;
  migrationVersion: string;
  documentModelVersion: string;
  updatedAt: string;
  updatedBy: string;
  contentHash: string;
};

export type ValidationMetadata = {
  ruleSetVersion: string;
  validationEngineVersion: string;
  documentModelContentHash: string;
  generatedAt: string;
};
