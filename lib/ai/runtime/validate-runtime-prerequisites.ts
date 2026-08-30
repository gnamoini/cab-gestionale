import "server-only";

import { createLanguageModel } from "@/lib/ai/runtime/client-factory";
import { readMasterEncryptionKeyEnv, readRuntimeModelForProvider, readRuntimeProviderDefault } from "@/lib/ai/runtime/env-reader";
import { normalizeGoogleModelId } from "@/lib/ai/runtime/providers/google";
import { loadActiveKeys, listProviderKeysMasked } from "@/lib/ai/runtime/config-store";
import { selectBestKey, buildNoSelectableKeyError } from "@/lib/ai/runtime/key-manager";
import type { AiProviderId } from "@/lib/ai/runtime/types";
import { PrerequisitesAnalyzeError } from "@/lib/document-capture/analyze-errors";
import { probeTesseractAvailability } from "@/lib/document-capture/extraction/tesseract-probe.server";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";

export type RuntimePrerequisitesResult = {
  provider: AiProviderId;
  modelId: string;
  keyId: string;
  keySlot: string;
  ocrAvailable: boolean;
  ocrWarning?: string;
};

export async function validateRuntimePrerequisites(options?: {
  requireOcr?: boolean;
  requireGemini?: boolean;
}): Promise<RuntimePrerequisitesResult> {
  const requireGemini = options?.requireGemini ?? true;
  const provider = readRuntimeProviderDefault() as AiProviderId;
  if (!provider) {
    throw new PrerequisitesAnalyzeError("Provider AI non configurato (AI_DEFAULT_PROVIDER).");
  }

  const modelId = normalizeGoogleModelId(readRuntimeModelForProvider(provider));
  if (!modelId.trim()) {
    throw new PrerequisitesAnalyzeError("Modello Gemini non configurato.");
  }

  const { keys } = await loadActiveKeys(provider, { skipCache: true });
  const best = selectBestKey(keys);
  if (requireGemini && !best) {
    throw new PrerequisitesAnalyzeError(buildNoSelectableKeyError(keys).message);
  }

  if (best) {
    try {
      createLanguageModel(provider, best.apiKey, modelId);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new PrerequisitesAnalyzeError(`SDK AI non inizializzabile: ${detail}`);
    }
  }

  const sb = createSupabaseServerServiceClient();
  const { error: storageError } = await sb.storage.from(STORAGE_BUCKETS.documentCapture).list("", { limit: 1 });
  if (storageError) {
    throw new PrerequisitesAnalyzeError(`Bucket storage non raggiungibile: ${storageError.message}`);
  }

  const dbKeys = await listProviderKeysMasked(provider);
  if (dbKeys.length > 0 && !readMasterEncryptionKeyEnv()) {
    throw new PrerequisitesAnalyzeError(
      "AI_MASTER_KEY_ENCRYPTION_KEY assente ma chiavi DB presenti — impossibile decifrare le chiavi.",
    );
  }

  const { error: pingError } = await sb.from("ai_provider_keys").select("id", { head: true, count: "exact" }).limit(1);
  if (pingError) {
    throw new PrerequisitesAnalyzeError(`Supabase service non operativo: ${pingError.message}`);
  }

  const ocr = await probeTesseractAvailability();
  if (options?.requireOcr && !ocr.available) {
    throw new PrerequisitesAnalyzeError(`OCR non disponibile: ${ocr.detail ?? "probe failed"}`);
  }

  if (!best) {
    throw new PrerequisitesAnalyzeError("Prerequisiti Gemini non soddisfatti.");
  }

  return {
    provider,
    modelId,
    keyId: best.id,
    keySlot: best.slot,
    ocrAvailable: ocr.available,
    ocrWarning: ocr.available ? undefined : ocr.detail,
  };
}
