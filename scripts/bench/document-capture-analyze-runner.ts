#!/usr/bin/env npx tsx
/**
 * Esegue analyze locale su bytes fixture e stampa trace JSON (stdout).
 * Uso: DOCUMENT_CAPTURE_ANALYZE_TRACE=1 npx tsx --env-file=.env.local scripts/bench/document-capture-analyze-runner.ts path/to/doc.pdf
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePhysicalPages } from "@/lib/document-capture/physical/physical-parser";
import { runHybridExtractionWithTimeout } from "@/lib/document-capture/extraction/run-hybrid-extraction.server";
import { normalizeCaptureMime } from "@/lib/document-capture/capture-mime";
import { createAnalyzeTrace } from "@/lib/document-capture/pipeline/analyze-trace.server";

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: document-capture-analyze-runner.ts <file>");
    process.exit(1);
  }
  const bytes = new Uint8Array(readFileSync(inputPath));
  const mime = normalizeCaptureMime({ fileName: path.basename(inputPath), bytes });
  const trace = createAnalyzeTrace({
    captureId: "bench-local",
    companyId: null,
    pipelineVersion: "v4.1",
  });
  trace.emit("START", "ok", { fileMime: mime, fileSize: bytes.byteLength });

  const tParse = performance.now();
  const pageObjects = await parsePhysicalPages(bytes, mime);
  trace.emit("PARSE_OK", "ok", { durationMs: Math.round(performance.now() - tParse) });

  trace.emit("HYBRID_START", "ok");
  const hybrid = await runHybridExtractionWithTimeout({
    bytes,
    mime,
    pageObjects,
    trace,
    timeoutMs: 60_000,
  });
  if (hybrid.status === "ok") {
    trace.emit("HYBRID_OK", "ok", {
      fieldCount: hybrid.data.mergedPrefill.length,
      detail: hybrid.data.needsGemini ? "needs_gemini" : "prefill_sufficient",
    });
  } else {
    trace.emit("HYBRID_SKIP", "skip", { detail: hybrid.status === "skip" ? hybrid.reason : hybrid.error });
  }

  trace.emit("END_OK", "ok", {
    fieldCount: hybrid.status === "ok" ? hybrid.data.mergedPrefill.length : 0,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
