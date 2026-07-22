#!/usr/bin/env npx tsx
/** Audit-only: compare single PDF vs chunked generation @ 500 labels. Not part of CI. */
import { PDFDocument } from "pdf-lib";
import { getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { renderMultiLabelPdfWithPipeline } from "@/lib/inventory-labels/render/pdf-pipeline";
import { readPeakHeapMb } from "@/lib/inventory-labels/render/pdf-concurrency";

function mockItems(count: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => ({
    payload: {
      marca: "BOSCH",
      marcaSecondaria: "MANN",
      descrizione: `Filtro olio benchmark ${offset + i + 1}`,
      codice: `ABC${String(offset + i + 1).padStart(4, "0")}`,
      codiceSecondario: `OE${offset + i + 1}`,
      fornitoreAlternativo: "FORN",
      codiceAlternativo: `ALT${offset + i + 1}`,
      fornitoriAlternativi: [{ name: "FORN", code: `ALT${offset + i + 1}` }],
    },
    qrUrl: `https://example.test/r/CAB-BENCH${offset + i}`,
  }));
}

async function scenarioSingle(total: number) {
  const template = getLabelTemplate("60x40-default")!;
  const t0 = performance.now();
  const heapBefore = readPeakHeapMb();
  const result = await renderMultiLabelPdfWithPipeline(template, mockItems(total));
  return {
    scenario: "single",
    count: total,
    durationMs: Math.round(performance.now() - t0),
    peakHeapMb: Math.max(heapBefore, result.peakHeapMb),
    outputBytes: result.bytes.byteLength,
  };
}

async function scenarioChunkedMerge(total: number, chunkSize: number) {
  const template = getLabelTemplate("60x40-default")!;
  const t0 = performance.now();
  let peakHeapMb = readPeakHeapMb();
  const chunkPdfs: Uint8Array[] = [];

  for (let off = 0; off < total; off += chunkSize) {
    const n = Math.min(chunkSize, total - off);
    const result = await renderMultiLabelPdfWithPipeline(template, mockItems(n, off));
    peakHeapMb = Math.max(peakHeapMb, result.peakHeapMb, readPeakHeapMb());
    chunkPdfs.push(result.bytes);
  }

  const mergeStartHeap = readPeakHeapMb();
  const merged = await PDFDocument.create();
  for (const pdfBytes of chunkPdfs) {
    const src = await PDFDocument.load(pdfBytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const p of pages) merged.addPage(p);
  }
  const out = await merged.save();
  peakHeapMb = Math.max(peakHeapMb, mergeStartHeap, readPeakHeapMb());

  return {
    scenario: `chunk_${chunkSize}_merge`,
    count: total,
    chunks: chunkPdfs.length,
    durationMs: Math.round(performance.now() - t0),
    peakHeapMb,
    outputBytes: out.byteLength,
    chunkBytesSum: chunkPdfs.reduce((s, b) => s + b.byteLength, 0),
  };
}

async function main() {
  const total = 500;
  const chunkSize = 50;
  console.log("scenario\tcount\tdurationMs\tpeakHeapMb\toutputBytes\textra");
  const s1 = await scenarioSingle(total);
  if (global.gc) global.gc();
  const s2 = await scenarioChunkedMerge(total, chunkSize);
  console.log(
    `${s1.scenario}\t${s1.count}\t${s1.durationMs}\t${s1.peakHeapMb}\t${s1.outputBytes}\t-`,
  );
  console.log(
    `${s2.scenario}\t${s2.count}\t${s2.durationMs}\t${s2.peakHeapMb}\t${s2.outputBytes}\tchunks=${s2.chunks} sumChunkBytes=${s2.chunkBytesSum}`,
  );
  const heapReduction =
    s1.peakHeapMb > 0 ? Math.round((1 - s2.peakHeapMb / s1.peakHeapMb) * 100) : 0;
  console.log(`heap_reduction_pct\t${heapReduction}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
