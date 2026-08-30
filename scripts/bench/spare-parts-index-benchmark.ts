#!/usr/bin/env npx tsx
/**
 * Benchmark recall estrazione/retrieval (fixture-driven).
 * Uso: npx tsx scripts/bench/spare-parts-index-benchmark.ts [--fixture path.json]
 */
import fs from "node:fs";
import path from "node:path";
import { evaluateExtractionQuality } from "@/lib/ai/spare-parts/understanding/extraction-quality-gate";
import { computeRetrievalRescueMetrics } from "@/lib/ai/spare-parts/retrieval/retrieval-rescue-metrics";

type Fixture = {
  documentoId: string;
  known_codes: string[];
  codes_extracted?: string[];
  codes_retrieved_structured?: string[];
  codes_retrieved_file_search?: string[];
  pages_processed?: number;
  parts_extracted?: number;
  chunk_success_rate?: number;
  duration_ms?: number;
};

const fixtureArg = process.argv.indexOf("--fixture");
const fixturePath =
  fixtureArg >= 0
    ? process.argv[fixtureArg + 1]
    : path.join(process.cwd(), "test/fixtures/spare-parts/benchmark-sample.json");

if (!fs.existsSync(fixturePath)) {
  const sample: Fixture = {
    documentoId: "00000000-0000-0000-0000-000000000001",
    known_codes: ["ABC123", "XYZ-9"],
    codes_extracted: ["ABC123"],
    codes_retrieved_structured: ["ABC123"],
    codes_retrieved_file_search: ["XYZ-9"],
    pages_processed: 12,
    parts_extracted: 1,
    chunk_success_rate: 1,
    duration_ms: 1200,
  };
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, JSON.stringify(sample, null, 2));
  console.error(`Fixture creata: ${fixturePath}`);
}

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as Fixture;
const known = new Set(fixture.known_codes.map((c) => c.toUpperCase()));
const extracted = new Set((fixture.codes_extracted ?? []).map((c) => c.toUpperCase()));
const structured = new Set((fixture.codes_retrieved_structured ?? []).map((c) => c.toUpperCase()));
const fileSearch = new Set((fixture.codes_retrieved_file_search ?? []).map((c) => c.toUpperCase()));
const retrieved = new Set([...structured, ...fileSearch]);

const extractionRecall = known.size ? [...known].filter((c) => extracted.has(c)).length / known.size : 0;
const retrievalRecall = known.size ? [...known].filter((c) => retrieved.has(c)).length / known.size : 0;
const rescue = computeRetrievalRescueMetrics({
  structuredCodes: [...structured],
  fileSearchCodes: [...fileSearch],
});

const quality = evaluateExtractionQuality({
  partsExtracted: fixture.parts_extracted ?? extracted.size,
  pagesProcessed: fixture.pages_processed ?? 1,
  chunkSuccessRate: fixture.chunk_success_rate ?? 1,
  partsWithPageEvidence: fixture.parts_extracted ?? extracted.size,
});

const row = {
  documento_id: fixture.documentoId,
  known_codes: known.size,
  codes_extracted: extracted.size,
  codes_retrieved: retrieved.size,
  extraction_recall: extractionRecall,
  retrieval_recall: retrievalRecall,
  file_search_rescue_rate:
    known.size - structured.size > 0 ? rescue.file_search_rescued / (known.size - structured.size) : 0,
  pages_processed: fixture.pages_processed ?? 0,
  parts_extracted: fixture.parts_extracted ?? 0,
  chunk_success_rate: fixture.chunk_success_rate ?? 0,
  understanding_status: quality.understandingStatus,
  duration_ms: fixture.duration_ms ?? 0,
};

console.log(
  [
    "documento_id",
    "known_codes",
    "codes_extracted",
    "codes_retrieved",
    "extraction_recall",
    "retrieval_recall",
    "file_search_rescue_rate",
    "pages_processed",
    "parts_extracted",
    "chunk_success_rate",
    "understanding_status",
    "duration_ms",
  ].join(","),
);
console.log(Object.values(row).join(","));
