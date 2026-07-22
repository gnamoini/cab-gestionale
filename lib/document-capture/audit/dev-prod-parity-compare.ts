import type { DevProdParitySnapshot, ParityCheckItem } from "@/lib/document-capture/audit/dev-prod-parity-types";

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

export function compareParitySnapshots(
  baseline: DevProdParitySnapshot,
  current: DevProdParitySnapshot,
): ParityCheckItem[] {
  const diffs: ParityCheckItem[] = [];

  const compareScalar = (key: string, a: unknown, b: unknown) => {
    if (a !== b) {
      diffs.push({
        key,
        status: "MISMATCH",
        expected: a as ParityCheckItem["expected"],
        value: b as ParityCheckItem["value"],
      });
    } else {
      diffs.push({ key, status: "OK", value: b as ParityCheckItem["value"] });
    }
  };

  compareScalar("aiRuntime.configured", baseline.aiRuntime.configured, current.aiRuntime.configured);
  compareScalar("aiRuntime.modelId", baseline.aiRuntime.modelId, current.aiRuntime.modelId);
  compareScalar("aiRuntime.activeKeyCount", baseline.aiRuntime.activeKeyCount, current.aiRuntime.activeKeyCount);
  compareScalar("aiRuntime.primarySource", baseline.aiRuntime.primarySource, current.aiRuntime.primarySource);
  compareScalar(
    "featureFlags.documentCaptureV41",
    baseline.featureFlags.documentCaptureV41,
    current.featureFlags.documentCaptureV41,
  );
  compareScalar(
    "featureFlags.documentCaptureHybrid",
    baseline.featureFlags.documentCaptureHybrid,
    current.featureFlags.documentCaptureHybrid,
  );
  compareScalar("storage.reachable", baseline.storage.reachable, current.storage.reachable);
  compareScalar("sdk.versions", baseline.sdk.versions, current.sdk.versions);

  for (const envKey of ENV_KEYS) {
    const a = baseline.env[envKey]?.present ?? false;
    const b = current.env[envKey]?.present ?? false;
    if (a !== b) {
      diffs.push({ key: `env.${envKey}`, status: "MISMATCH", expected: a, value: b });
    }
  }

  return diffs;
}
