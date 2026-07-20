import assert from "node:assert/strict";
import {
  MAX_RESOLUTION_DEPTH,
  resolveCanonicalMetricId,
  resolveCanonicalMetricIdFromLookup,
} from "@/lib/report/metrics/resolve-metric-id";

assert.equal(resolveCanonicalMetricId("eco_invoices"), "eco_fatturato", "single hop");
assert.equal(resolveCanonicalMetricId("eco_fatturato"), "eco_fatturato", "already canonical");
assert.equal(resolveCanonicalMetricId("lav_open"), "lav-aperti");
assert.equal(resolveCanonicalMetricId("lav_backlog"), "lav-aperti");
assert.equal(resolveCanonicalMetricId("mag_critical"), "scorta");
assert.equal(resolveCanonicalMetricId("lav-saldo-periodo"), "lav_aging_backlog");
assert.equal(resolveCanonicalMetricId("nonexistent-metric-id"), "nonexistent-metric-id");

const chainLookup = (id: string) => {
  const map: Record<string, { status: "deprecated" | "active"; replacementId?: string }> = {
    lav_old: { status: "deprecated", replacementId: "lav_alias" },
    lav_alias: { status: "deprecated", replacementId: "lav_canonical" },
    lav_canonical: { status: "active" },
  };
  return map[id];
};

assert.equal(
  resolveCanonicalMetricIdFromLookup("lav_old", chainLookup),
  "lav_canonical",
  "multi-hop chain",
);

const cycleLookup = (id: string) => {
  const map: Record<string, { status: "deprecated"; replacementId: string }> = {
    a: { status: "deprecated", replacementId: "b" },
    b: { status: "deprecated", replacementId: "a" },
  };
  return map[id];
};

assert.throws(
  () => resolveCanonicalMetricIdFromLookup("a", cycleLookup),
  /cycle detected/,
);

const deepLookup = (id: string) => {
  const map: Record<string, { status: "deprecated" | "active"; replacementId?: string }> = {
    hop0: { status: "deprecated", replacementId: "hop1" },
    hop1: { status: "deprecated", replacementId: "hop2" },
    hop2: { status: "deprecated", replacementId: "hop3" },
    hop3: { status: "deprecated", replacementId: "hop4" },
    hop4: { status: "active" },
  };
  return map[id];
};

assert.throws(
  () => resolveCanonicalMetricIdFromLookup("hop0", deepLookup),
  /MAX_RESOLUTION_DEPTH/,
);

assert.equal(MAX_RESOLUTION_DEPTH, 3);

console.log("resolve-metric-id.test.ts OK");
