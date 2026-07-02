#!/usr/bin/env npx tsx
/**
 * Costruisce/aggiorna dataset benchmark da export preventivi (placeholder manuale).
 * ponytail: export DB non automatico in CI — estendere con query Supabase se necessario.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runFullBenchmarkComparison } from "@/lib/domain/technical-knowledge-base/benchmark/run-benchmark";

const here = dirname(fileURLToPath(import.meta.url));
const report = runFullBenchmarkComparison();
const outPath = join(here, "last-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log("Benchmark report written to", outPath);
console.log(JSON.stringify(report, null, 2));
