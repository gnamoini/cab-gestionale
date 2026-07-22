import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compareParitySnapshots } from "@/lib/document-capture/audit/dev-prod-parity-compare";

const src = readFileSync(
  join(process.cwd(), "lib/document-capture/audit/dev-prod-parity-audit.server.ts"),
  "utf8",
);
assert.match(src, /buildDevProdParitySnapshot/);
assert.match(src, /compareParitySnapshots/);
assert.match(src, /indexedBootstrapKeyCounts/);

const baseline = {
  capturedAt: "a",
  environment: { vercelEnv: "production", deploymentId: "1", nodeVersion: "v", runtime: "nodejs" as const },
  env: { GOOGLE_GENERATIVE_AI_API_KEY: { present: true, length: 10 } },
  featureFlags: { documentCaptureV41: true, documentCaptureHybrid: true, documentCaptureLauncherApplyV1: true },
  aiRuntime: {
    configured: true,
    provider: "google",
    modelId: "gemini-3.5-flash",
    activeKeyCount: 1,
    primarySource: "legacy_env",
    degradedMode: false,
    timeoutMs: 90000,
    maxDurationSec: 300,
    indexedBootstrapKeyCounts: { google: 1 },
    masterKeyPresent: false,
  },
  storage: { bucket: "document-capture", reachable: true },
  ocr: { available: false },
  sdk: { versions: "ai@1" },
  checks: [],
};

const current = { ...baseline, aiRuntime: { ...baseline.aiRuntime, configured: false } };
const diff = compareParitySnapshots(baseline, current);
assert.ok(diff.some((d) => d.key === "aiRuntime.configured" && d.status === "MISMATCH"));

console.log("dev-prod-parity-audit.test.ts OK");
