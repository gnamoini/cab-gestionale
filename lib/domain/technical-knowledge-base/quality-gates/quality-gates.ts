import "server-only";

import { validateTkbDraftBundle } from "../tkb-snapshot-builder";
import { runTdeBenchmark } from "../benchmark/run-benchmark";
import { kbStatsFromBuildReport } from "../ingestion/builder";
import { loadQualityGateThresholds } from "./thresholds";
import type { BenchmarkReport, TkbBuildReport, TkbDraftBundle, TkbKbStats } from "../types";

export type QualityGateResult =
  | { ok: true; benchmark: BenchmarkReport; kbStats: TkbKbStats }
  | { ok: false; blockedBy: string[]; details: Record<string, unknown> };

export type QualityGateBaseline = {
  kbCoverage?: number;
  oar?: number;
  thr?: number;
};

export function runQualityGates(
  bundle: TkbDraftBundle,
  baseline?: QualityGateBaseline,
): QualityGateResult {
  const thresholds = loadQualityGateThresholds();
  const blockedBy: string[] = [];
  const details: Record<string, unknown> = {};

  try {
    validateTkbDraftBundle(bundle);
  } catch (e) {
    blockedBy.push("validation");
    details.validation = e instanceof Error ? e.message : String(e);
    return { ok: false, blockedBy, details };
  }

  if (bundle.interventi.length < thresholds.minInterventi && bundle.buildReport?.warnings?.includes("seed:fallback:db_vuoto")) {
    // seed-only DB — skip min counts
  } else {
    if (bundle.interventi.length < thresholds.minInterventi) {
      blockedBy.push("min_interventi");
      details.minInterventi = { required: thresholds.minInterventi, actual: bundle.interventi.length };
    }
    if (bundle.componenti.length < thresholds.minComponenti) {
      blockedBy.push("min_componenti");
      details.minComponenti = { required: thresholds.minComponenti, actual: bundle.componenti.length };
    }
  }

  const benchmark = runTdeBenchmark(bundle);
  details.benchmark = benchmark;

  if (benchmark.thr > thresholds.maxThr) {
    blockedBy.push("thr");
    details.thr = { max: thresholds.maxThr, actual: benchmark.thr };
  }

  if (baseline?.kbCoverage != null && baseline.kbCoverage - benchmark.kbCoverage > thresholds.maxCoverageDrop) {
    blockedBy.push("coverage_regression");
    details.coverage = { baseline: baseline.kbCoverage, actual: benchmark.kbCoverage };
  }

  if (baseline?.oar != null && baseline.oar - benchmark.oar > thresholds.maxOarDrop) {
    blockedBy.push("oar_regression");
    details.oar = { baseline: baseline.oar, actual: benchmark.oar };
  }

  const kbStats = bundle.buildReport
    ? kbStatsFromBuildReport(bundle.buildReport)
    : {
        interventi: bundle.interventi.length,
        componenti: bundle.componenti.length,
        descrizioni: 0,
        categorie: bundle.categorie.length,
        excludedDeleted: 0,
        sourceCoverage: {},
        warnings: [],
      };

  if (blockedBy.length) return { ok: false, blockedBy, details };
  return { ok: true, benchmark, kbStats };
}
