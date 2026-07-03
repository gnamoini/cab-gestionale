import benchmarkDataset from "./dataset.json";
import {
  resetDescriptionEngineDevState,
  generatePreventivoDescription,
} from "@/lib/preventivi/description-engine/description-engine";
import { trasformaDescrizioneLavorazioni } from "@/lib/preventivi/trasforma-descrizione";
import type { DescrizionePreventivoContext } from "@/lib/preventivi/preventivi-descrizione-aggregator";
import type { BenchmarkCase, BenchmarkReport, TkbDraftBundle } from "../types";
import { publishTkbDraft, resetMemorySnapshots } from "../tkb-publish";
import { buildPublishedSnapshot } from "../tkb-snapshot-builder";

export type { BenchmarkCase, BenchmarkReport } from "../types";

const emptyCtx: DescrizionePreventivoContext = {
  cliente: "",
  targa: "",
  matricola: "",
  existingPreventiviRecords: [],
};

function loadDataset(): BenchmarkCase[] {
  return benchmarkDataset as BenchmarkCase[];
}

function normLine(s: string): string {
  return s.trim().toLowerCase();
}

function computeMetrics(
  engine: "legacy" | "tde_v1",
  cases: BenchmarkCase[],
  runCase: (c: BenchmarkCase) => {
    lines: string[];
    activityIds: (string | null)[];
    verified: boolean[];
    tier?: string;
    matched?: boolean;
  },
): BenchmarkReport {
  let covered = 0;
  let oarSum = 0;
  let zeroEdit = 0;
  let unwanted = 0;
  let unwantedTotal = 0;
  let hallucinated = 0;
  let verifiedTotal = 0;
  const tiers: Record<string, number> = { high: 0, medium: 0, low: 0 };

  for (const c of cases) {
    const result = runCase(c);
    if (result.matched) covered++;

    const approvedSet = new Set(c.approvedLines.map(normLine));
    const approvedIds = new Set(c.approvedActivityIds ?? []);

    let accepted = 0;
    for (let i = 0; i < result.lines.length; i++) {
      const line = result.lines[i]!;
      const id = result.activityIds[i];
      const verified = result.verified[i] ?? false;

      const inApproved =
        approvedSet.has(normLine(line)) || (id != null && approvedIds.has(id));

      if (inApproved) accepted++;
      else {
        unwantedTotal++;
        if (approvedSet.size > 0) unwanted++;
      }

      if (verified) {
        verifiedTotal++;
        if (!inApproved) hallucinated++;
      }
    }

    oarSum += result.lines.length > 0 ? accepted / result.lines.length : 0;
    if (accepted === result.lines.length && result.lines.length === c.approvedLines.length) {
      zeroEdit++;
    }

    if (result.tier) tiers[result.tier] = (tiers[result.tier] ?? 0) + 1;
  }

  const n = cases.length || 1;
  return {
    engine,
    cases: cases.length,
    kbCoverage: covered / n,
    oar: oarSum / n,
    zeroEditRate: zeroEdit / n,
    unwantedLineRate: unwantedTotal > 0 ? unwanted / unwantedTotal : 0,
    thr: verifiedTotal > 0 ? hallucinated / verifiedTotal : 0,
    tierDistribution: tiers,
  };
}

export function runLegacyBenchmark(): BenchmarkReport {
  const cases = loadDataset();
  return computeMetrics("legacy", cases, (c) => {
    const text = trasformaDescrizioneLavorazioni(c.technicalBlob, emptyCtx);
    const lines = text
      .split("\n")
      .map((l) => l.replace(/^-\s*/, "").trim())
      .filter(Boolean);
    return {
      lines,
      activityIds: lines.map(() => null),
      verified: lines.map(() => false),
      matched: false,
    };
  });
}

export function runTdeBenchmark(draftBundle?: TkbDraftBundle): BenchmarkReport {
  resetDescriptionEngineDevState();
  if (draftBundle) {
    resetMemorySnapshots();
    const snap = buildPublishedSnapshot(draftBundle, 1, new Date().toISOString());
    publishTkbDraft({ ...draftBundle, buildReport: undefined });
    void snap;
  }
  const cases = loadDataset();
  return computeMetrics("tde_v1", cases, (c) => {
    const composed = generatePreventivoDescription({
      technicalBlob: c.technicalBlob,
      anomaliaText: c.anomaliaText,
      ctx: emptyCtx,
      ricambi: [],
    });
    return {
      lines: composed.lines.map((l) => l.text),
      activityIds: composed.lines.map((l) => l.activityId),
      verified: composed.lines.map((l) => l.isVerifiedTechnical),
      tier: composed.meta.confidenceTier,
      matched: composed.meta.matchedEntries.length > 0,
    };
  });
}

export function runTdeBenchmarkWithDraft(draftBundle?: TkbDraftBundle): BenchmarkReport {
  return runTdeBenchmark(draftBundle);
}

export function runFullBenchmarkComparison(): { legacy: BenchmarkReport; tde: BenchmarkReport } {
  return { legacy: runLegacyBenchmark(), tde: runTdeBenchmark() };
}
