import "server-only";

import { classifyMagazzinoCategorieWithAi } from "@/lib/ai/magazzino-categoria-classify";
import {
  inferMagazzinoCategoriaHeuristic,
  resolveMagazzinoCategoriaFallback,
} from "@/lib/magazzino/magazzino-categoria-infer";
import { isListinoImportAiRateLimited } from "@/lib/magazzino/listino-import/listino-import-rate-limit.server";
import type { ListinoImportRawRow } from "@/lib/magazzino/listino-import/listino-import-types";

export const HEURISTIC_CONFIDENCE_THRESHOLD = 0.55;

export type ListinoImportCategoriaSource = "heuristic" | "ai" | "fallback";

export type ListinoImportRowWithCategoria = ListinoImportRawRow & {
  categoria: string;
  categoriaSource: ListinoImportCategoriaSource;
};

export async function assignListinoImportCategorie(
  rows: ListinoImportRawRow[],
  categories: string[],
  opts: { userId?: string },
): Promise<{ rows: ListinoImportRowWithCategoria[]; warnings: string[] }> {
  const warnings: string[] = [];
  const master = categories.length ? categories : ["Generale"];
  const fallback = resolveMagazzinoCategoriaFallback(master);

  const heuristicByIndex = rows.map((row, rowIndex) => {
    const inferred = inferMagazzinoCategoriaHeuristic(row.descrizione, master);
    return { rowIndex, row, inferred };
  });

  const lowConfidence = heuristicByIndex.filter((h) => h.inferred.confidence < HEURISTIC_CONFIDENCE_THRESHOLD);

  let aiMap = new Map<number, string>();
  if (lowConfidence.length > 0) {
    const userId = opts.userId?.trim();
    if (userId && (await isListinoImportAiRateLimited(userId))) {
      warnings.push("Classificazione categorie IA non disponibile: limite richieste raggiunto.");
    } else {
      const aiResult = await classifyMagazzinoCategorieWithAi({
        items: lowConfidence.map((h) => ({ rowIndex: h.rowIndex, descrizione: h.row.descrizione })),
        categories: master,
      });
      if (!aiResult.ok) {
        warnings.push(`Classificazione categorie IA non disponibile: ${aiResult.reason}`);
      } else {
        aiMap = aiResult.map;
      }
    }
  }

  const rowsWithCategoria: ListinoImportRowWithCategoria[] = heuristicByIndex.map(({ rowIndex, row, inferred }) => {
    const aiCategoria = aiMap.get(rowIndex);
    if (aiCategoria) {
      return { ...row, categoria: aiCategoria, categoriaSource: "ai" };
    }
    if (inferred.confidence >= HEURISTIC_CONFIDENCE_THRESHOLD) {
      return { ...row, categoria: inferred.categoria, categoriaSource: "heuristic" };
    }
    return {
      ...row,
      categoria: inferred.source === "fallback" ? fallback : inferred.categoria,
      categoriaSource: "fallback",
    };
  });

  return { rows: rowsWithCategoria, warnings };
}
