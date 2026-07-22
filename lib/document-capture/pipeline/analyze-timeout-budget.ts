import "server-only";

import { AnalyzeTimeoutBudget as CoreAnalyzeTimeoutBudget } from "@/lib/document-capture/analyze-timeout-budget-core";

const DEFAULT_RESERVE_MS = 5_000;

export function readDocumentCaptureMaxDurationSec(): number {
  const raw = process.env.DOCUMENT_CAPTURE_MAX_DURATION;
  const n = raw ? Number.parseInt(raw, 10) : 300;
  return Number.isFinite(n) && n > 0 ? n : 300;
}

export function readAnalyzeTotalBudgetMs(reserveMs = DEFAULT_RESERVE_MS): number {
  return readDocumentCaptureMaxDurationSec() * 1_000 - reserveMs;
}

/** ponytail: deterministic serverless budget — ogni fase alloca dal residuo. */
export class AnalyzeTimeoutBudget extends CoreAnalyzeTimeoutBudget {
  constructor(totalBudgetMs?: number) {
    super(totalBudgetMs ?? readAnalyzeTotalBudgetMs());
  }
}
