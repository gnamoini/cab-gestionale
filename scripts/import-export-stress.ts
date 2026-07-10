#!/usr/bin/env npx tsx
/**
 * PRG stress report — staging only, non-blocking.
 * Usage: npx tsx scripts/import-export-stress.ts
 */
import { performance } from "node:perf_hooks";

type Row = Record<string, string | number | null>;

function buildDirtyRows(count: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < count; i++) {
    const dup = i % 20 === 0;
    const badFk = i % 20 === 1;
    const badCol = i % 100 === 0;
    rows.push({
      targa: dup ? "DUP-001" : `PRG-${i}`,
      cliente: badFk ? "__missing_client__" : `Cliente ${i} àèé 🚗`,
      anno: badCol ? ("not-a-number" as unknown as number) : 2020 + (i % 5),
      note: i % 50 === 0 ? "x".repeat(500) : null,
    });
  }
  return rows;
}

async function bench(label: string, fn: () => void | Promise<void>) {
  const heapBefore = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  await fn();
  const ms = Math.round(performance.now() - t0);
  const heapAfter = process.memoryUsage().heapUsed;
  console.log(
    JSON.stringify({
      label,
      duration_ms: ms,
      heap_delta_mb: Math.round((heapAfter - heapBefore) / 1024 / 1024),
      rows_scanned: label.includes("10k") ? 10000 : undefined,
    }),
  );
}

async function main() {
  console.log("# Import/Export stress report (PRG v1.2)");
  const sizes = [10, 100, 1000, 10000];
  for (const n of sizes) {
    await bench(`dirty-json-serialize-${n}`, () => {
      const rows = buildDirtyRows(n);
      const json = JSON.stringify(rows);
      void json.length;
    });
  }
  console.log("\n# Note: full DB export/import stress requires IMPORT_PRG_INTEGRATION=1 on staging.");
}

void main();
