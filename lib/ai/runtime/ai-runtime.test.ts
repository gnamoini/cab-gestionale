import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cooldownSecondsForError,
  orderKeysForFailover,
  scoreKey,
  selectBestKey,
} from "@/lib/ai/runtime/key-manager";
import { classifyAiError, isFailoverEligible } from "@/lib/ai/runtime/errors";
import { resetKeyCacheForTests } from "@/lib/ai/runtime/key-cache";
import type { ResolvedAiKey } from "@/lib/ai/runtime/types";

function mockKey(partial: Partial<ResolvedAiKey> & Pick<ResolvedAiKey, "id" | "apiKey">): ResolvedAiKey {
  return {
    provider: "google",
    slot: "test",
    priority: 100,
    weight: 100,
    status: "healthy",
    cooldownUntil: null,
    fingerprint: createHash("sha256").update(partial.apiKey).digest("hex").slice(0, 16),
    source: "legacy_env",
    requestsTotal: 0,
    successTotal: 0,
    failureTotal: 0,
    rateLimitTotal: 0,
    latencyMsAvg: null,
    lastUsedAt: null,
    ...partial,
  };
}

resetKeyCacheForTests();

assert.equal(selectBestKey([]), null);

const k1 = mockKey({ id: "1", apiKey: "key-a", priority: 10 });
const k2 = mockKey({ id: "2", apiKey: "key-b", priority: 20 });
const ordered = orderKeysForFailover([k1, k2], k1);
assert.equal(ordered.length, 2);
assert.equal(ordered[0]!.id, "1");

const invalid = mockKey({ id: "3", apiKey: "key-c", status: "invalid" });
assert.equal(selectBestKey([invalid]), null);

assert.equal(classifyAiError(new Error("401 API KEY invalid")), "AI_KEY_INVALID");
assert.equal(classifyAiError(new Error("429 quota")), "AI_QUOTA_EXCEEDED");
assert.equal(classifyAiError(new Error("TimeoutError")), "AI_TIMEOUT");
assert.equal(isFailoverEligible("AI_RATE_LIMIT"), true);
assert.equal(cooldownSecondsForError("AI_RATE_LIMIT"), 120);

assert.ok(scoreKey(k1) > 0);

console.log("ai-runtime.test.ts OK");
