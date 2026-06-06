/**
 * Long-session soak audit — campiona metriche modulo (Node) per CI/dev.
 * In browser: importare collectLongSessionMetrics da @/lib/observability/long-session-metrics.
 *
 * Usage: npx tsx scripts/long-session-soak-audit.ts [--samples N] [--interval-ms MS]
 */
import { collectLongSessionMetrics } from "@/lib/observability/long-session-metrics";

const args = process.argv.slice(2);
const samplesIdx = args.indexOf("--samples");
const intervalIdx = args.indexOf("--interval-ms");
const sampleCount = samplesIdx >= 0 ? Math.max(1, Number(args[samplesIdx + 1]) || 1) : 1;
const intervalMs = intervalIdx >= 0 ? Math.max(1000, Number(args[intervalIdx + 1]) || 5000) : 0;

function printSample(label: string): void {
  const snap = collectLongSessionMetrics();
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(snap, null, 2));
}

async function main(): Promise<void> {
  console.log("Long-session soak audit (module metrics — heap/RQ richiedono browser devtools)\n");

  if (sampleCount === 1 && intervalMs === 0) {
    printSample("snapshot");
    return;
  }

  for (let i = 0; i < sampleCount; i++) {
    printSample(`sample ${i + 1}/${sampleCount}`);
    if (i < sampleCount - 1 && intervalMs > 0) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  console.log("\nSoak audit complete. Per heap/RQ: Chrome Memory + React Query Devtools durante sessione reale.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
