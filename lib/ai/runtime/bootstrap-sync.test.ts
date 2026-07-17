import assert from "node:assert/strict";
import { inspectApiKeyFormat } from "@/lib/ai/runtime/key-validation";
import { resolveIngestMode } from "@/lib/ai/runtime/ingest-mode";
import type { AiProviderKeyRow } from "@/lib/ai/runtime/types";

assert.equal(inspectApiKeyFormat("").valid, false);
assert.equal(inspectApiKeyFormat("AIzaSyD-example-key-1234567890").valid, true);
assert.equal(inspectApiKeyFormat("AQ.fake-test-key-for-unit-tests-only").valid, true);

const existing: AiProviderKeyRow = {
  id: "1",
  provider: "google",
  slot: "google-01",
  encrypted_key: "x",
  key_fingerprint: "fp1",
  enabled: true,
  priority: 10,
  weight: 100,
  status: "healthy",
  cooldown_until: null,
  requests_total: 0,
  success_total: 0,
  failure_total: 0,
  rate_limit_total: 0,
  latency_ms_sum: 0,
  latency_ms_count: 0,
  last_used_at: null,
  last_success_at: null,
  last_failure_at: null,
  last_error: null,
};

assert.equal(resolveIngestMode("fp1", existing), "EXISTING");
assert.equal(resolveIngestMode("fp-new", undefined), "NEW");
assert.equal(resolveIngestMode("fp1", { ...existing, status: "invalid" }), "RECOVERY");

console.log("bootstrap-sync.test.ts OK");
