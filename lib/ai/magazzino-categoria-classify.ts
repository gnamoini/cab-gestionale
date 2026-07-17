import "server-only";

import { z } from "zod";
import { aiService } from "@/lib/ai/runtime/service";
import { aiErrorMessage } from "@/lib/ai/runtime/errors";
import { readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";
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
  if (!(await aiService.getConfigurationStatus()).configured) {
    return { ok: false, reason: aiErrorMessage("AI_CONFIG_MISSING") };
  }

  const result = await aiService.generateObject<z.infer<typeof magazzinoCategoriaClassifySchema>>({
    schema: magazzinoCategoriaClassifySchema,
    system: CLASSIFY_SYSTEM,
    prompt: buildPrompt(items, categories),
    temperature: 0.1,
    timeoutMs: readRuntimeTimeoutMs(),
    operation: "magazzino_categoria_classify",
  });

  if (!result.ok) {
    return { ok: false, reason: result.message };
  }

  const map = new Map<number, string>();
  for (const assignment of result.data.object.assignments) {
    map.set(assignment.rowIndex, resolveMagazzinoCategoriaFromMaster(assignment.categoria, categories));
  }
  return { ok: true, map };
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
