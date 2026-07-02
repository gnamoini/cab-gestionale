import { dedupeDescriptionLines } from "@/lib/preventivi/preventivi-descrizione-aggregator";
import { trasformaDescrizioneLavorazioni } from "@/lib/preventivi/trasforma-descrizione";
import type { GeneratedDescriptionLine } from "./types";

export function legacyChunksFromBlob(technicalBlob: string): string[] {
  return technicalBlob
    .split(/[+;,\n\r]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function enrichWithLegacyLines(opts: {
  existingLines: GeneratedDescriptionLine[];
  unmatchedChunks: string[];
  ctx: import("@/lib/preventivi/preventivi-descrizione-aggregator").DescrizionePreventivoContext;
  maxLegacyLines: number;
  sortStart: number;
  sourceType: "legacy_enrichment" | "legacy_heuristic";
}): GeneratedDescriptionLine[] {
  const { existingLines, unmatchedChunks, ctx, maxLegacyLines, sortStart, sourceType } = opts;
  if (unmatchedChunks.length === 0 || maxLegacyLines <= 0) return [];

  const existingTexts = new Set(existingLines.map((l) => l.text.toLowerCase()));
  const out: GeneratedDescriptionLine[] = [];
  let sort = sortStart;

  for (const chunk of unmatchedChunks.slice(0, maxLegacyLines)) {
    const legacyText = trasformaDescrizioneLavorazioni(chunk, ctx);
    const legacyLines = legacyText
      .split("\n")
      .map((l) => l.replace(/^-\s*/, "").trim())
      .filter(Boolean);

    for (const text of dedupeDescriptionLines(legacyLines)) {
      if (existingTexts.has(text.toLowerCase())) continue;
      existingTexts.add(text.toLowerCase());
      out.push({
        activityId: null,
        text,
        sourceType,
        sourceId: `legacy:${chunk.slice(0, 48)}`,
        confidence: 0.35,
        isVerifiedTechnical: false,
        sort: sort++,
        metadata: { chunk },
      });
    }
  }

  return out;
}

export function legacyPrimaryLines(opts: {
  technicalBlob: string;
  ctx: import("@/lib/preventivi/preventivi-descrizione-aggregator").DescrizionePreventivoContext;
}): GeneratedDescriptionLine[] {
  const text = trasformaDescrizioneLavorazioni(opts.technicalBlob, opts.ctx);
  return text
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean)
    .map((line, idx) => ({
      activityId: null,
      text: line,
      sourceType: "legacy_heuristic" as const,
      sourceId: `legacy-primary:${idx}`,
      confidence: 0.3,
      isVerifiedTechnical: false,
      sort: idx + 1,
    }));
}
