#!/usr/bin/env npx tsx
/**
 * Benchmark memoria generazione PDF etichette — locale / nightly opzionale.
 * Usage: npx tsx scripts/benchmark-label-pdf-memory.ts [counts...]
 */
import { getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { renderMultiLabelPdfWithPipeline } from "@/lib/inventory-labels/render/pdf-pipeline";
import { readPeakHeapMb, resolveLabelPdfRenderConcurrency } from "@/lib/inventory-labels/render/pdf-concurrency";

const DEFAULT_COUNTS = [1, 10, 50, 100];

function mockItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    payload: {
      marca: "BOSCH",
      marcaSecondaria: "MANN",
      descrizione: `Filtro olio benchmark ${i + 1}`,
      codice: `ABC${String(i + 1).padStart(4, "0")}`,
      codiceSecondario: `OE${i + 1}`,
      fornitoreAlternativo: "FORN",
      codiceAlternativo: `ALT${i + 1}`,
    },
    qrUrl: `https://example.test/r/CAB-BENCH${i}`,
  }));
}

async function runCount(count: number) {
  const template = getLabelTemplate("60x40-default");
  if (!template) throw new Error("template missing");
  const t0 = performance.now();
  const heapBefore = readPeakHeapMb();
  const result = await renderMultiLabelPdfWithPipeline(template, mockItems(count));
  const durationMs = Math.round(performance.now() - t0);
  return {
    count,
    durationMs,
    peakHeapMb: Math.max(heapBefore, result.peakHeapMb),
    outputBytes: result.bytes.byteLength,
    pipeline: result.pipeline,
    kind: result.kind,
    concurrency: resolveLabelPdfRenderConcurrency(),
  };
}

async function main() {
  const counts = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  const runCounts = counts.length ? counts : DEFAULT_COUNTS;
  console.log("count\tdurationMs\tpeakHeapMb\tbytes\tpipeline\tkind\tconcurrency");
  for (const count of runCounts) {
    if (global.gc) global.gc();
    const row = await runCount(count);
    console.log(
      `${row.count}\t${row.durationMs}\t${row.peakHeapMb}\t${row.outputBytes}\t${row.pipeline}\t${row.kind}\t${row.concurrency}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
