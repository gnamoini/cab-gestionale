import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  GESTIONALE_CORE_STALE_MS,
  GESTIONALE_REPORT_STALE_MS,
  GESTIONALE_VIEW_STALE_MS,
} from "@/lib/react-query/query-layer-policies";
import { CLIENT_PAGE_SIZE } from "@/lib/ui/use-client-pagination";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.equal(GESTIONALE_CORE_STALE_MS, 30_000);
assert.equal(GESTIONALE_VIEW_STALE_MS, 60_000);
assert.equal(GESTIONALE_REPORT_STALE_MS, 120_000);
assert.equal(CLIENT_PAGE_SIZE, 100);

const realtimeConfig = read("lib/realtime/gestionale-realtime-config.ts");
assert.match(realtimeConfig, /GESTIONALE_REALTIME_POLL_MS = 20_000/);

const reportView = read("components/gestionale/report/report-view.tsx");
const documentiView = read("components/gestionale/documenti/documenti-view.tsx");
const bunderView = read("components/bunder/bunder-view.tsx");
const preventiviView = read("components/preventivi/preventivi-view.tsx");
const lavorazioniView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");

for (const [name, src] of [
  ["report-view", reportView],
  ["documenti-view", documentiView],
  ["bunder-view", bunderView],
  ["preventivi-view", preventiviView],
  ["lavorazioni-view", lavorazioniView],
] as const) {
  assert.match(src, /dynamic\s*\(/, `${name} missing next/dynamic code split`);
}

const queryPolicies = read("lib/react-query/query-layer-policies.ts");
assert.match(queryPolicies, /refetchOnWindowFocus: false/);
assert.match(queryPolicies, /GESTIONALE_REPORT_STALE_MS = 120_000/);

console.log("performance-policy.test.ts OK");
