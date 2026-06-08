/**
 * Long-session soak audit — campiona metriche modulo (Node) per CI/dev.
 * In browser: importare collectLongSessionMetrics da @/lib/observability/long-session-metrics.
 *
 * Usage: npx tsx scripts/long-session-soak-audit.ts [--samples N] [--interval-ms MS] [--gate]
 */
import { collectLongSessionMetricsNode } from "@/lib/observability/long-session-metrics-node";
import { exitWithGate, printGateResult } from "@/lib/ci/gate-output";
import type { LongSessionMetricsSnapshot } from "@/lib/observability/long-session-metrics";

const GATE_NAME = "Long-session soak (module)";

const args = process.argv.slice(2);
const samplesIdx = args.indexOf("--samples");
const intervalIdx = args.indexOf("--interval-ms");
const gateMode = args.includes("--gate");
const sampleCount = samplesIdx >= 0 ? Math.max(1, Number(args[samplesIdx + 1]) || 1) : 1;
const intervalMs = intervalIdx >= 0 ? Math.max(1000, Number(args[intervalIdx + 1]) || 5000) : 0;

const MAX_LISTENERS = Number(process.env.SOAK_MAX_CAB_SYNC_LISTENERS ?? "0");
const MAX_SNAPSHOT_REGISTRY = Number(process.env.SOAK_MAX_RICAMBIO_SNAPSHOT_REGISTRY ?? "0");
const MAX_SCORTA_QUEUE = Number(process.env.SOAK_MAX_SCORTA_SYNC_QUEUE ?? "50");

function printSample(label: string, snap: LongSessionMetricsSnapshot): void {
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(snap, null, 2));
}

function evaluateThresholds(samples: LongSessionMetricsSnapshot[]): string[] {
  const blockers: string[] = [];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    if (s.cabSyncListeners > MAX_LISTENERS) {
      blockers.push(`sample ${i + 1}: cabSyncListeners ${s.cabSyncListeners} > ${MAX_LISTENERS}`);
    }
    if (s.ricambioSnapshotRegistrySize > MAX_SNAPSHOT_REGISTRY) {
      blockers.push(
        `sample ${i + 1}: ricambioSnapshotRegistrySize ${s.ricambioSnapshotRegistrySize} > ${MAX_SNAPSHOT_REGISTRY}`,
      );
    }
    if (s.scortaSyncQueueSize > MAX_SCORTA_QUEUE) {
      blockers.push(`sample ${i + 1}: scortaSyncQueueSize ${s.scortaSyncQueueSize} > ${MAX_SCORTA_QUEUE}`);
    }
  }
  return blockers;
}

async function main(): Promise<void> {
  console.log("Long-session soak audit (module metrics — heap/RQ richiedono browser devtools)\n");

  const samples: LongSessionMetricsSnapshot[] = [];

  if (sampleCount === 1 && intervalMs === 0) {
    const snap = collectLongSessionMetricsNode();
    printSample("snapshot", snap);
    samples.push(snap);
  } else {
    for (let i = 0; i < sampleCount; i++) {
      const snap = collectLongSessionMetricsNode();
      printSample(`sample ${i + 1}/${sampleCount}`, snap);
      samples.push(snap);
      if (i < sampleCount - 1 && intervalMs > 0) {
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    }
    console.log("\nSoak audit complete. Per heap/RQ: Chrome Memory + React Query Devtools durante sessione reale.");
  }

  if (!gateMode) return;

  const blockers = evaluateThresholds(samples);
  const status = blockers.length === 0 ? "PASS" : "FAIL";
  printGateResult({ name: GATE_NAME, status, blockers });
  exitWithGate(status);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
