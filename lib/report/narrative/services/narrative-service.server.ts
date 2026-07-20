import "server-only";

import { resolveReportV2NarrativeEnabled } from "@/lib/feature-flags/report-v2-flag";
import type { GenerateNarrativeResult } from "@/lib/report/narrative/contracts/narrative-provider.types";
import { geminiNarrativeProvider } from "@/lib/report/narrative/providers/gemini-adapter";
import { isNarrativeRateLimited } from "@/lib/report/narrative/services/narrative-rate-limit.server";
import type { NarrativePromptContext } from "@/lib/report/narrative/types";

export type NarrativeServiceInvokeOpts = {
  userId: string;
  companyId: string;
};

export const narrativeService = {
  isConfigured(): boolean {
    return geminiNarrativeProvider.isConfigured();
  },

  async generateFromPromptContext(
    ctx: NarrativePromptContext,
    opts: NarrativeServiceInvokeOpts,
    signal?: AbortSignal,
  ): Promise<GenerateNarrativeResult> {
    if (!resolveReportV2NarrativeEnabled()) {
      return { ok: false, code: "not_configured", message: "Report V2 narrative disabled" };
    }

    if (await isNarrativeRateLimited({ ...opts, operation: "report_narrative" })) {
      return { ok: false, code: "rate_limited", message: "Rate limit exceeded" };
    }

    if (!geminiNarrativeProvider.isConfigured()) {
      return { ok: false, code: "not_configured", message: "Narrative provider not configured" };
    }

    return geminiNarrativeProvider.generate(ctx, signal);
  },
};
