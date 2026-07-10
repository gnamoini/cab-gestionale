import "server-only";

import { generateObject } from "ai";
import { z } from "zod";
import {
  GEMINI_AUTH_ERROR_HINT,
  GEMINI_FILE_ANALYSIS_TIMEOUT_MS,
  GEMINI_NOT_CONFIGURED_MESSAGE,
  getGeminiReportModel,
  isGeminiAuthError,
  isGeminiConfigured,
} from "@/lib/ai/gemini-client";
import { resolveMagazzinoCategoriaFromMaster } from "@/lib/magazzino/magazzino-categoria-infer";

const BATCH_SIZE = 50;

const magazzinoCategoriaClassifySchema = z.object({
  assignments: z.array(
    z.object({
      rowIndex: z.number().int().min(0),
      categoria: z.string(),
    }),
  ),
});

const CLASSIFY_SYSTEM = `Sei un assistente per officina meccanica. Assegna a ogni ricambio la categoria più appropriata dalla lista fornita.
Usa solo etichette esatte dalla lista. Se non sei sicuro, usa "Generale" (o l'equivalente nella lista).`;

export type MagazzinoCategoriaClassifyResult =
  | { ok: true; map: Map<number, string> }
  | { ok: false; reason: string };

function buildPrompt(items: Array<{ rowIndex: number; descrizione: string }>, categories: readonly string[]): string {
  const lines = items.map((i) => `${i.rowIndex}: ${i.descrizione.trim()}`);
  return [
    `Categorie disponibili: ${categories.join(" | ")}`,
    "Righe (rowIndex: descrizione):",
    ...lines,
  ].join("\n");
}

async function classifyBatch(
  items: Array<{ rowIndex: number; descrizione: string }>,
  categories: readonly string[],
): Promise<MagazzinoCategoriaClassifyResult> {
  if (!isGeminiConfigured()) {
    return { ok: false, reason: GEMINI_NOT_CONFIGURED_MESSAGE };
  }

  try {
    const model = getGeminiReportModel();
    if (!model) {
      return { ok: false, reason: GEMINI_NOT_CONFIGURED_MESSAGE };
    }
    const { object } = await generateObject({
      model,
      schema: magazzinoCategoriaClassifySchema,
      system: CLASSIFY_SYSTEM,
      prompt: buildPrompt(items, categories),
      temperature: 0.1,
      abortSignal: AbortSignal.timeout(GEMINI_FILE_ANALYSIS_TIMEOUT_MS),
    });

    const map = new Map<number, string>();
    for (const assignment of object.assignments) {
      map.set(
        assignment.rowIndex,
        resolveMagazzinoCategoriaFromMaster(assignment.categoria, categories),
      );
    }
    return { ok: true, map };
  } catch (error) {
    if (isGeminiAuthError(error)) {
      return { ok: false, reason: GEMINI_AUTH_ERROR_HINT };
    }
    const message = error instanceof Error ? error.message : "Classificazione categorie non riuscita.";
    return { ok: false, reason: message };
  }
}

export async function classifyMagazzinoCategorieWithAi(input: {
  items: Array<{ rowIndex: number; descrizione: string }>;
  categories: readonly string[];
}): Promise<MagazzinoCategoriaClassifyResult> {
  const categories = [...new Set(input.categories.map((c) => c.trim()).filter(Boolean))];
  if (!categories.length || !input.items.length) {
    return { ok: true, map: new Map() };
  }

  const map = new Map<number, string>();
  for (let i = 0; i < input.items.length; i += BATCH_SIZE) {
    const batch = input.items.slice(i, i + BATCH_SIZE);
    const result = await classifyBatch(batch, categories);
    if (!result.ok) return result;
    for (const [rowIndex, categoria] of result.map) {
      map.set(rowIndex, categoria);
    }
  }

  return { ok: true, map };
}
