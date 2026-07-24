import "server-only";

import { z } from "zod";
import { aiService } from "@/lib/ai/runtime/service";
import { logAiObs } from "@/lib/ai/runtime/observability";
import { resolveGeminiReportModelId } from "@/lib/ai/gemini-client";
import {
  buildPreventivoPolishUserPrompt,
  PREVENTIVO_POLISH_SYSTEM,
} from "@/lib/preventivi/description-engine/prompts/preventivo-polish";
import {
  buildPolishCacheKey,
  getPolishCache,
  PREVENTIVO_POLISH_MODEL_VERSION,
  setPolishCache,
} from "@/lib/preventivi/description-engine/polish-cache.server";
import {
  updateGuardContextLineCount,
  validatePolishOutput,
  type PolishGuardContext,
} from "@/lib/preventivi/description-engine/polish-guard";

export const PREVENTIVO_POLISH_TIMEOUT_MS = 5000;

export type PreventivoPolishReason =
  | "cache_hit"
  | "applied"
  | "identical"
  | "timeout"
  | "provider_error"
  | "guard_reject"
  | "line_count_mismatch";

export type PreventivoPolishResult = {
  attempted: true;
  applied: boolean;
  fallback: boolean;
  text: string;
  reason?: PreventivoPolishReason;
  cacheHit: boolean;
  durationMs: number;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
};

const polishLinesSchema = z.object({
  lines: z.array(z.string()),
});

function linesToClienteText(lines: readonly string[]): string {
  return lines.map((l) => (l.startsWith("-") ? l : `- ${l}`)).join("\n");
}

function splitDescriptionLines(description: string): string[] {
  return description
    .split(/\r?\n/)
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

export type RunPreventivoPolishInput = {
  description: string;
  technicalFingerprint: string;
  guardContext: PolishGuardContext;
};

export async function runPreventivoPolish(
  input: RunPreventivoPolishInput,
): Promise<PreventivoPolishResult> {
  const t0 = performance.now();
  const model = resolveGeminiReportModelId();
  const guardContext = updateGuardContextLineCount(input.guardContext, input.description);
  const cacheKey = buildPolishCacheKey(
    input.description,
    input.technicalFingerprint,
    PREVENTIVO_POLISH_MODEL_VERSION,
  );

  const cached = getPolishCache(cacheKey);
  if (cached) {
    const durationMs = Math.round(performance.now() - t0);
    logAiObs("AI_RESPONSE", {
      operation: "preventivo_polish",
      model,
      durationMs,
      cacheHit: true,
      applied: cached.applied,
      fallback: !cached.applied,
    });
    return {
      attempted: true,
      applied: cached.applied,
      fallback: !cached.applied,
      text: cached.text,
      reason: "cache_hit",
      cacheHit: true,
      durationMs,
      model,
    };
  }

  const preLines = splitDescriptionLines(input.description);
  if (preLines.length === 0) {
    const durationMs = Math.round(performance.now() - t0);
    return {
      attempted: true,
      applied: false,
      fallback: true,
      text: input.description,
      reason: "guard_reject",
      cacheHit: false,
      durationMs,
      model,
    };
  }

  logAiObs("AI_REQUEST", { operation: "preventivo_polish", model });

  const aiResult = await aiService.generateObject<z.infer<typeof polishLinesSchema>>({
    schema: polishLinesSchema,
    system: PREVENTIVO_POLISH_SYSTEM,
    prompt: buildPreventivoPolishUserPrompt(input.description),
    temperature: 0.2,
    timeoutMs: PREVENTIVO_POLISH_TIMEOUT_MS,
    operation: "preventivo_polish",
  });

  const durationMs = Math.round(performance.now() - t0);

  if (!aiResult.ok) {
    const isTimeout = aiResult.code === "AI_TIMEOUT" || /timeout|aborted/i.test(aiResult.message);
    logAiObs("AI_FAILURE", {
      operation: "preventivo_polish",
      model,
      durationMs,
      errorCode: aiResult.code,
      fallback: true,
    });
    return {
      attempted: true,
      applied: false,
      fallback: true,
      text: input.description,
      reason: isTimeout ? "timeout" : "provider_error",
      cacheHit: false,
      durationMs,
      model,
    };
  }

  const polishedLines = aiResult.data.object.lines;
  if (polishedLines.length !== preLines.length) {
    logAiObs("AI_RESPONSE", {
      operation: "preventivo_polish",
      model,
      durationMs,
      guardReject: true,
      reason: "line_count_mismatch",
    });
    return {
      attempted: true,
      applied: false,
      fallback: true,
      text: input.description,
      reason: "line_count_mismatch",
      cacheHit: false,
      durationMs,
      model,
      inputTokens: aiResult.data.usage?.inputTokens,
      outputTokens: aiResult.data.usage?.outputTokens,
    };
  }

  const polishedText = linesToClienteText(polishedLines);
  const guard = validatePolishOutput(input.description, polishedText, guardContext);
  if (!guard.ok) {
    logAiObs("AI_RESPONSE", {
      operation: "preventivo_polish",
      model,
      durationMs,
      guardReject: true,
      guardReason: guard.reason,
    });
    return {
      attempted: true,
      applied: false,
      fallback: true,
      text: input.description,
      reason: "guard_reject",
      cacheHit: false,
      durationMs,
      model,
      inputTokens: aiResult.data.usage?.inputTokens,
      outputTokens: aiResult.data.usage?.outputTokens,
    };
  }

  const identical = polishedText.trim() === input.description.trim();
  const applied = true;
  setPolishCache(cacheKey, polishedText, applied);

  logAiObs("AI_RESPONSE", {
    operation: "preventivo_polish",
    model,
    durationMs,
    applied: true,
    identical,
    inputTokens: aiResult.data.usage?.inputTokens,
    outputTokens: aiResult.data.usage?.outputTokens,
  });

  return {
    attempted: true,
    applied: true,
    fallback: false,
    text: polishedText,
    reason: identical ? "identical" : "applied",
    cacheHit: false,
    durationMs,
    model,
    inputTokens: aiResult.data.usage?.inputTokens,
    outputTokens: aiResult.data.usage?.outputTokens,
  };
}
