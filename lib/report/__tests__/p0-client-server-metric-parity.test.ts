import assert from "node:assert/strict";
import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

/** Canonical path P0: registry + resolver; UI/AI mantengono alias deprecated fino a P1. */
assert.equal(resolveCanonicalMetricId("lav_open"), "lav-aperti");
assert.equal(resolveCanonicalMetricId("lav_clients"), "clienti");
assert.equal(resolveCanonicalMetricId("eco_invoices"), "eco_fatturato");

const eco = getRegistryEntry("eco_fatturato");
assert.ok(eco);
assert.equal(eco!.applicability, "period");

const deprecated = getRegistryEntry("eco_invoices");
assert.ok(deprecated);
assert.equal(deprecated!.replacementId, "eco_fatturato");

console.log("p0-client-server-metric-parity.test.ts OK");
