export type ParityCheckStatus = "OK" | "MISMATCH" | "MISSING" | "WARNING";

export type ParityCheckItem = {
  key: string;
  status: ParityCheckStatus;
  value?: string | number | boolean | null;
  expected?: string | number | boolean | null;
  note?: string;
};

export type DevProdParitySnapshot = {
  capturedAt: string;
  environment: {
    vercelEnv: string | null;
    deploymentId: string | null;
    nodeVersion: string;
    runtime: "nodejs";
  };
  env: Record<string, { present: boolean; length: number }>;
  featureFlags: Record<string, boolean>;
  aiRuntime: {
    configured: boolean;
    provider: string;
    modelId: string;
    activeKeyCount: number;
    primarySource: string | null;
    degradedMode: boolean;
    timeoutMs: number;
    maxDurationSec: number;
    indexedBootstrapKeyCounts: Record<string, number>;
    masterKeyPresent: boolean;
  };
  storage: {
    bucket: string;
    reachable: boolean;
    error?: string;
  };
  ocr: {
    available: boolean;
    detail?: string;
  };
  sdk: {
    versions: string;
  };
  checks: ParityCheckItem[];
};
