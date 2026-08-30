#!/usr/bin/env npx tsx
/**
 * PDF subsystem benchmark — label raster (offline) + optional artifact HTTP.
 *
 * Label counts: 1, 10, 100, 500
 * Artifact scenarios (HTTP): cold/MISS, warm/MISS, warm/HIT
 *
 * Usage:
 *   npx tsx scripts/benchmark-pdf-subsystem.ts
 *   npx tsx scripts/benchmark-pdf-subsystem.ts --labels-only
 *   npx tsx scripts/benchmark-pdf-subsystem.ts --artifacts --base-url http://localhost:3000
 */
import { getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { renderMultiLabelPdfWithPipeline } from "@/lib/inventory-labels/render/pdf-pipeline";
import { readPeakHeapMb, resolveLabelPdfRenderConcurrency } from "@/lib/inventory-labels/render/pdf-concurrency";
import { renderMezzoLabelsPdf } from "@/lib/mezzo-labels/render/pdf";
import type { MezzoLabelPayload } from "@/lib/mezzo-labels/domain/types";

const LABEL_COUNTS = [1, 10, 100, 500];
const ARTIFACT_RUNS = 10;

type BenchRow = {
  case: string;
  scenario: string;
  run: number;
  totalMs: number;
  peakHeapMb: number;
  outputBytes: number;
  cacheStatus: string;
};

function mockInventoryItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    payload: {
      marca: "BOSCH",
      marcaSecondaria: "MANN",
      descrizione: `Filtro benchmark ${i + 1}`,
      codice: `ABC${String(i + 1).padStart(4, "0")}`,
      codiceSecondario: `OE${i + 1}`,
      fornitoreAlternativo: "FORN",
      codiceAlternativo: `ALT${i + 1}`,
      fornitoriAlternativi: [{ name: "FORN", code: `ALT${i + 1}` }],
    },
    qrUrl: `https://example.test/r/CAB-BENCH${i}`,
  }));
}

function mockMezzoPayload(i: number): MezzoLabelPayload {
  return {
    targa: `AB${String(100 + i).padStart(3, "0")}CD`,
    numeroScuderia: i % 3 === 0 ? `SCU${i}` : null,
  };
}

function mockMezzoSlots(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    payload: mockMezzoPayload(i),
    qrUrl: `https://example.test/m/MZZ-BENCH${i}`,
  }));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

function summarize(rows: BenchRow[]) {
  const byKey = new Map<string, number[]>();
  for (const row of rows) {
    const key = `${row.case}\t${row.scenario}`;
    const list = byKey.get(key) ?? [];
    list.push(row.totalMs);
    byKey.set(key, list);
  }
  console.log("\n=== summary (p50 / p95 ms) ===");
  console.log("case\tscenario\tp50\tp95\truns");
  for (const [key, times] of byKey) {
    const sorted = [...times].sort((a, b) => a - b);
    console.log(`${key}\t${percentile(sorted, 50)}\t${percentile(sorted, 95)}\t${sorted.length}`);
  }
}

async function benchInventoryLabels(rows: BenchRow[]) {
  const template = getLabelTemplate("60x40-default");
  if (!template) throw new Error("template missing");
  for (const count of LABEL_COUNTS) {
    if (global.gc) global.gc();
    const t0 = performance.now();
    const heapBefore = readPeakHeapMb();
    const result = await renderMultiLabelPdfWithPipeline(template, mockInventoryItems(count));
    rows.push({
      case: "inventory-label",
      scenario: `count=${count}`,
      run: 1,
      totalMs: Math.round(performance.now() - t0),
      peakHeapMb: Math.max(heapBefore, result.peakHeapMb),
      outputBytes: result.bytes.byteLength,
      cacheStatus: result.pipeline,
    });
  }
}

async function benchMezzoLabels(rows: BenchRow[]) {
  for (const count of LABEL_COUNTS) {
    if (global.gc) global.gc();
    const heapBefore = readPeakHeapMb();
    const t0 = performance.now();
    const bytes = await renderMezzoLabelsPdf(mockMezzoSlots(count));
    rows.push({
      case: "mezzo-label-50x22",
      scenario: `count=${count}`,
      run: 1,
      totalMs: Math.round(performance.now() - t0),
      peakHeapMb: Math.max(heapBefore, readPeakHeapMb()),
      outputBytes: bytes.byteLength,
      cacheStatus: "n/a",
    });
  }
}

type ArtifactBenchTarget = {
  name: string;
  path: string;
};

const ARTIFACT_TARGETS: ArtifactBenchTarget[] = [
  { name: "lavorazioni-in-corso", path: "/api/pdf/artifacts/lavorazioni-in-corso" },
  { name: "report-bundle", path: "/api/pdf/artifacts/report-bundle" },
];

async function fetchArtifactTiming(
  baseUrl: string,
  path: string,
  cookie?: string,
): Promise<{ totalMs: number; cacheStatus: string; ttfbMs: number }> {
  const t0 = performance.now();
  const headers: Record<string, string> = {};
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, { headers, redirect: "follow" });
  const ttfbMs = Math.round(performance.now() - t0);
  await res.arrayBuffer();
  const totalMs = Math.round(performance.now() - t0);
  return {
    totalMs,
    ttfbMs,
    cacheStatus: res.headers.get("x-cache-status") ?? "unknown",
  };
}

async function benchArtifactsHttp(baseUrl: string, rows: BenchRow[], cookie?: string) {
  for (const target of ARTIFACT_TARGETS) {
    for (let run = 1; run <= ARTIFACT_RUNS; run++) {
      const warm = run > 1;
      const first = await fetchArtifactTiming(baseUrl, target.path, cookie);
      rows.push({
        case: target.name,
        scenario: warm ? (first.cacheStatus === "HIT" ? "warm/HIT" : "warm/MISS") : "cold/MISS",
        run,
        totalMs: first.totalMs,
        peakHeapMb: 0,
        outputBytes: 0,
        cacheStatus: first.cacheStatus,
      });
      if (run === 1 && first.cacheStatus === "HIT") {
        const second = await fetchArtifactTiming(baseUrl, target.path, cookie);
        rows.push({
          case: target.name,
          scenario: "warm/HIT",
          run: 1,
          totalMs: second.totalMs,
          peakHeapMb: 0,
          outputBytes: 0,
          cacheStatus: second.cacheStatus,
        });
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const labelsOnly = args.includes("--labels-only");
  const artifactsOnly = args.includes("--artifacts");
  const baseUrlIdx = args.indexOf("--base-url");
  const baseUrl = baseUrlIdx >= 0 ? args[baseUrlIdx + 1] : process.env.PDF_BENCH_BASE_URL;
  const cookie = process.env.PDF_BENCH_COOKIE;

  const rows: BenchRow[] = [];

  if (!artifactsOnly) {
    console.log("=== inventory labels (concurrency=%s) ===", resolveLabelPdfRenderConcurrency());
    await benchInventoryLabels(rows);
    console.log("=== mezzo labels 50x22 ===");
    await benchMezzoLabels(rows);
  }

  if (!labelsOnly && baseUrl) {
    console.log("=== artifact HTTP @ %s ===", baseUrl);
    await benchArtifactsHttp(baseUrl, rows, cookie);
  } else if (!labelsOnly && !artifactsOnly) {
    console.log("\n(skip artifact HTTP — set PDF_BENCH_BASE_URL or --base-url http://localhost:3000)");
  }

  console.log("\ncase\tscenario\trun\ttotalMs\tpeakHeapMb\tbytes\tcacheStatus");
  for (const row of rows) {
    console.log(
      `${row.case}\t${row.scenario}\t${row.run}\t${row.totalMs}\t${row.peakHeapMb}\t${row.outputBytes}\t${row.cacheStatus}`,
    );
  }
  summarize(rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
