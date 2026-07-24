import { AnalyzeTimeoutError } from "@/lib/document-capture/analyze-errors";

/** Core timeout budget — no server-only for unit tests. */
export class AnalyzeTimeoutBudget {
  private remaining: number;

  constructor(totalBudgetMs: number) {
    this.remaining = totalBudgetMs;
  }

  remainingMs(): number {
    return Math.max(0, this.remaining);
  }

  allocate(phase: string, requestedMs: number): number {
    const allocated = Math.min(requestedMs, this.remaining);
    this.remaining -= allocated;
    if (allocated <= 0) {
      throw new AnalyzeTimeoutError(`Budget esaurito prima della fase: ${phase}`);
    }
    return allocated;
  }

  assertRemaining(phase: string): void {
    if (this.remaining <= 0) {
      throw new AnalyzeTimeoutError(`Budget esaurito alla fase: ${phase}`);
    }
  }
}
