import "server-only";

import { aiService } from "@/lib/ai/runtime/service";
import {
  countIndexedBootstrapKeys,
  readMasterEncryptionKeyEnv,
  readRuntimeModelForProvider,
  readRuntimeProviderDefault,
  readRuntimeSecret,
  readRuntimeTimeoutMs,
} from "@/lib/ai/runtime/env-reader";
import type { DevProdParitySnapshot, ParityCheckItem } from "@/lib/document-capture/audit/dev-prod-parity-types";
export type { DevProdParitySnapshot, ParityCheckItem, ParityCheckStatus } from "@/lib/document-capture/audit/dev-prod-parity-types";
export { compareParitySnapshots } from "@/lib/document-capture/audit/dev-prod-parity-compare";
import { readAnalyzeSdkVersion } from "@/lib/document-capture/pipeline/analyze-trace.server";
import { readDocumentCaptureMaxDurationSec } from "@/lib/document-capture/pipeline/analyze-timeout-budget";
import { isDocumentCaptureHybridExtractionEnabled } from "@/lib/document-capture/document-capture-hybrid.server";
import { isDocumentCaptureV41Enabled } from "@/lib/document-capture/document-capture-v41.server";
import { probeTesseractAvailability } from "@/lib/document-capture/extraction/tesseract-probe.server";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";

const ENV_KEYS = [
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_API_KEY_SECONDARY",
  "AI_MASTER_KEY_ENCRYPTION_KEY",
  "AI_DEFAULT_PROVIDER",
  "AI_MODEL_GOOGLE",
  "GEMINI_MODEL_ID",
  "AI_TIMEOUT_MS",
  "DOCUMENT_CAPTURE_MAX_DURATION",
  "DOCUMENT_CAPTURE_V41",
  "DOCUMENT_CAPTURE_HYBRID_EXTRACTION",
  "DOCUMENT_CAPTURE_LAUNCHER_APPLY_V1",
] as const;

function envPresence(name: string): { present: boolean; length: number } {
  const v = readRuntimeSecret(name);
  return { present: v.length > 0, length: v.length };
}

async function probeStorageBucket(): Promise<{ reachable: boolean; error?: string }> {
  try {
    const sb = createSupabaseServerServiceClient();
    const { data, error } = await sb.storage.from(STORAGE_BUCKETS.documentCapture).list("", { limit: 1 });
    if (error) return { reachable: false, error: error.message };
    void data;
    return { reachable: true };
  } catch (e) {
    return { reachable: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function buildDevProdParitySnapshot(): Promise<DevProdParitySnapshot> {
  const aiStatus = await aiService.getConfigurationStatus();
  const storageProbe = await probeStorageBucket();
  const ocrProbe = await probeTesseractAvailability();
  const indexedBootstrapKeyCounts = countIndexedBootstrapKeys();

  const env: DevProdParitySnapshot["env"] = {};
  for (const key of ENV_KEYS) {
    env[key] = envPresence(key);
  }

  const featureFlags = {
    documentCaptureV41: isDocumentCaptureV41Enabled(),
    documentCaptureHybrid: isDocumentCaptureHybridExtractionEnabled(),
    documentCaptureLauncherApplyV1: readRuntimeSecret("DOCUMENT_CAPTURE_LAUNCHER_APPLY_V1") !== "0",
  };

  const checks: ParityCheckItem[] = [];

  checks.push({
    key: "ai.configured",
    status: aiStatus.configured ? "OK" : "MISSING",
    value: aiStatus.configured,
    note: aiStatus.configured ? undefined : "Nessuna chiave AI selezionabile",
  });

  checks.push({
    key: "storage.document-capture",
    status: storageProbe.reachable ? "OK" : "MISSING",
    value: storageProbe.reachable,
    note: storageProbe.error,
  });

  checks.push({
    key: "ocr.tesseract",
    status: ocrProbe.available ? "OK" : "WARNING",
    value: ocrProbe.available,
    note: ocrProbe.detail,
  });

  if (!env.AI_MASTER_KEY_ENCRYPTION_KEY.present && aiStatus.primarySource === "database") {
    checks.push({
      key: "ai.masterKey",
      status: "WARNING",
      value: false,
      note: "Chiavi DB presenti ma AI_MASTER_KEY_ENCRYPTION_KEY assente",
    });
  }

  return {
    capturedAt: new Date().toISOString(),
    environment: {
      vercelEnv: process.env.VERCEL_ENV ?? null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      nodeVersion: process.version,
      runtime: "nodejs",
    },
    env,
    featureFlags,
    aiRuntime: {
      configured: aiStatus.configured,
      provider: readRuntimeProviderDefault(),
      modelId: readRuntimeModelForProvider(readRuntimeProviderDefault()),
      activeKeyCount: aiStatus.activeKeyCount,
      primarySource: aiStatus.primarySource,
      degradedMode: aiStatus.degradedMode,
      timeoutMs: readRuntimeTimeoutMs(),
      maxDurationSec: readDocumentCaptureMaxDurationSec(),
      indexedBootstrapKeyCounts,
      masterKeyPresent: readMasterEncryptionKeyEnv().length > 0,
    },
    storage: {
      bucket: STORAGE_BUCKETS.documentCapture,
      reachable: storageProbe.reachable,
      error: storageProbe.error,
    },
    ocr: ocrProbe,
    sdk: { versions: readAnalyzeSdkVersion() },
    checks,
  };
}
