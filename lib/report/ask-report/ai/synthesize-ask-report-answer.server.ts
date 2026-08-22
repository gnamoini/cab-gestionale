import "server-only";

import { z } from "zod";
import { aiService } from "@/lib/ai/runtime/service";
import { readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";
import type { AskReportIntent, AskReportToolResult } from "@/lib/report/ask-report/types";
import { buildDeterministicAnswer } from "@/lib/report/ask-report/answer/build-deterministic-answer";
import type { EffectiveAskContext } from "@/lib/report/ask-report/types";

const askSynthesisSchema = z.object({
  answer: z.string().min(1).max(1600),
});

const ASK_SYNTHESIS_SYSTEM = `Sei l'assistente "Chiedi al Report" di un gestionale officina.
Rispondi in italiano, tono diretto per la direzione.

REGOLE:
1. Usa SOLO numeri e fatti presenti nel JSON toolResults — non inventare.
2. Se ci sono più metriche, confrontale chiaramente (valore + variazione % se disponibile).
3. Per spiegazioni ("perché"), collega metriche e insight senza causalità certa.
4. Se il dato è stimato/parziale, dillo.
5. Risposta breve: 2-6 frasi, niente elenchi lunghi se non necessari.`;

export type SynthesizeAskReportAnswerInput = {
  message: string;
  intent: AskReportIntent;
  toolResults: AskReportToolResult[];
  effective: EffectiveAskContext;
  deterministicAnswer: string;
};

export async function synthesizeAskReportAnswer(
  input: SynthesizeAskReportAnswerInput,
): Promise<{ answer: string; usedAi: boolean }> {
  const status = await aiService.getConfigurationStatus();
  if (!status.configured) {
    return { answer: input.deterministicAnswer, usedAi: false };
  }

  const successful = input.toolResults.filter((r) => r.success && r.data);
  if (!successful.length) {
    return { answer: input.deterministicAnswer, usedAi: false };
  }

  const timeoutMs = Math.min(readRuntimeTimeoutMs(), 20_000);
  const payload = {
    question: input.message,
    intent: input.intent,
    period: input.effective.period,
    compareMode: input.effective.compareMode,
    toolResults: successful.map((r) => ({
      tool: r.toolName,
      data: r.data,
      provenance: r.provenance,
    })),
    deterministicDraft: input.deterministicAnswer,
  };

  const result = await aiService.generateObject<{ answer: string }>({
    schema: askSynthesisSchema,
    system: ASK_SYNTHESIS_SYSTEM,
    prompt: JSON.stringify(payload),
    temperature: 0.2,
    operation: "ask_report_synthesis",
    provider: status.provider,
    timeoutMs,
  });

  if (!result.ok || !result.data.object.answer.trim()) {
    return { answer: input.deterministicAnswer, usedAi: false };
  }

  return { answer: result.data.object.answer.trim(), usedAi: true };
}

export function shouldSynthesizeWithAi(input: {
  planMode: "deterministic" | "llm";
  intent: AskReportIntent;
  toolResults: AskReportToolResult[];
}): boolean {
  if (input.intent === "recidivita_query") return false;
  if (input.planMode === "llm") return true;
  const metricCount = input.toolResults.filter((r) => r.toolName === "get_metric" && r.success).length;
  if (metricCount > 1) return true;
  if (input.intent === "explanation_query" && input.toolResults.some((r) => r.toolName === "get_insights")) {
    return true;
  }
  if (input.intent === "summary_query") return true;
  return false;
}

/** ponytail: fallback sempre disponibile se AI non configurata o fallisce */
export function resolveAskReportAnswer(input: {
  message: string;
  intent: AskReportIntent;
  planMode: "deterministic" | "llm";
  toolResults: AskReportToolResult[];
  effective: EffectiveAskContext;
}): Promise<{ answer: string; citations: ReturnType<typeof buildDeterministicAnswer>["citations"]; usedAi: boolean }> {
  const { answer, citations } = buildDeterministicAnswer(input.toolResults, input.effective);
  if (!shouldSynthesizeWithAi(input)) {
    return Promise.resolve({ answer, citations, usedAi: false });
  }
  return synthesizeAskReportAnswer({
    message: input.message,
    intent: input.intent,
    toolResults: input.toolResults,
    effective: input.effective,
    deterministicAnswer: answer,
  }).then((r) => ({ answer: r.answer, citations, usedAi: r.usedAi }));
}
