import {
  PROJECTOR_VERSION,
  SCHEDA_OFFICINA_RULE_SET_VERSION,
} from "@/lib/document-capture/model/versions";
import type { PromptContract } from "@/lib/document-capture/registry/document-type-registry";
import {
  SCHEDA_OFFICINA_EXTRACTION_SYSTEM,
  SCHEDA_OFFICINA_EXTRACTION_USER,
} from "@/lib/document-capture/scheda-officina-extraction-prompt";

export const SCHEDA_OFFICINA_PROMPT_CONTRACT_ID = "scheda_officina_bundle_v1";

export const schedaOfficinaPromptContract: PromptContract = {
  id: SCHEDA_OFFICINA_PROMPT_CONTRACT_ID,
  version: "1.0.0",
  documentType: "scheda_officina_bundle",
  expectedModelId: "gemini",
  inputLimits: {
    maxPages: 50,
    maxBytes: 25 * 1024 * 1024,
    maxEstimatedTokens: 120_000,
  },
  retryPolicy: {
    maxAttempts: 3,
    backoffMs: [1_000, 3_000],
    retryableErrors: ["timeout", "rate_limit", "analyze_failed"],
  },
  systemPrompt: SCHEDA_OFFICINA_EXTRACTION_SYSTEM,
  userPromptTemplate: SCHEDA_OFFICINA_EXTRACTION_USER,
  outputSchemaVersion: "1.0.0",
  projectorVersion: PROJECTOR_VERSION,
  active: true,
};

void SCHEDA_OFFICINA_RULE_SET_VERSION;
