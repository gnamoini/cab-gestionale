import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { RUNTIME_COORDINATION_EVENT_TYPES } from "@/lib/observability/runtime-coordination-types";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.ok(
  fs.existsSync(path.join(ROOT, "docs/runtime-coordination-observability.md")),
  "runtime-coordination-observability doc missing",
);

const tracerTypes = read("lib/observability/runtime-coordination-types.ts");
for (const eventType of RUNTIME_COORDINATION_EVENT_TYPES) {
  assert.match(tracerTypes, new RegExp(`"${eventType}"`), `tracer missing event type ${eventType}`);
}
assert.match(read("lib/observability/runtime-coordination-tracer.ts"), /traceRuntimeCoordination/);

const micCore = read("lib/cache/minimal-invalidation-contract.ts");
assert.match(micCore, /traceRuntimeCoordination/);
assert.match(micCore, /mic_invalidation_triggered/);
assert.match(micCore, /X-Correlation-Id/);

const serverTracer = read("lib/observability/runtime-coordination-tracer.server.ts");
assert.match(serverTracer, /import "server-only"/);
assert.match(serverTracer, /traceRuntimeCoordinationServer/);

const config = read("lib/observability/config.ts");
assert.match(config, /isRuntimeCoordinationTraceEnabled/);
assert.match(config, /NODE_ENV === "production"/);

const debugMount = read("lib/observability/runtime-coordination-debug.ts");
assert.match(debugMount, /__GESTIONALE_RC__/);

const devMounts = read("components/gestionale/dev-audit-mounts.tsx");
assert.match(devMounts, /RuntimeCoordinationDebugMount/);

const lavMutations = read("src/hooks/gestionale/use-lavorazione-mutations.ts");
assert.match(lavMutations, /traceMutationLifecycle/);

const mezzoMutations = read("src/hooks/gestionale/use-mezzo-mutations.ts");
assert.match(mezzoMutations, /traceMutationLifecycle/);

const documentiView = read("components/gestionale/documenti/documenti-view.tsx");
assert.match(documentiView, /traceMutationLifecycle/);

const lavDocs = read("components/gestionale/media/lavorazione-documents-manager.tsx");
assert.match(lavDocs, /traceMutationLifecycle/);

const settingsPersist = read("lib/sync/persist-settings-record.ts");
assert.match(settingsPersist, /traceMutationLifecycle/);

console.log("runtime-coordination-policy: OK");
