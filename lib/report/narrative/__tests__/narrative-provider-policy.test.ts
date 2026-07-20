import assert from "node:assert/strict";
import {
  NARRATIVE_PROVIDER_TEMPERATURE,
  NARRATIVE_PROVIDER_TIMEOUT_MS,
  resolveNarrativeProviderTimeoutMs,
} from "@/lib/report/narrative/providers/narrative-provider-policy";
import fs from "node:fs";
import path from "node:path";

assert.equal(NARRATIVE_PROVIDER_TIMEOUT_MS, 45_000);
assert.equal(NARRATIVE_PROVIDER_TEMPERATURE, 0.3);

const resolved = resolveNarrativeProviderTimeoutMs();
assert.ok(resolved > 0);
assert.ok(resolved <= NARRATIVE_PROVIDER_TIMEOUT_MS);

const adapterSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/providers/gemini-adapter.ts"),
  "utf8",
);
assert.match(adapterSrc, /resolveNarrativeProviderTimeoutMs\(\)/);
assert.match(adapterSrc, /timeoutMs,/);

console.log("narrative-provider-policy.test.ts OK");
