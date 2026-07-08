import type { ImportQuality, ImportQualityLevel } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import type { FornitoreMatchMethod } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";

export function qualityLevelFromScore(score: number): ImportQualityLevel {
  if (score >= 0.85) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

export function computeImportQuality(input: {
  headerConfidence: number;
  righeConfidence: number;
  fornitoreMatchMethod: FornitoreMatchMethod;
  matchedRigheCount: number;
  totalRigheCount: number;
}): ImportQuality {
  let score = 0;
  score += input.headerConfidence * 0.3;
  score += input.righeConfidence * 0.4;
  score += input.totalRigheCount > 0 ? (input.matchedRigheCount / input.totalRigheCount) * 0.2 : 0;

  if (["piva", "cf", "exact", "normalized"].includes(input.fornitoreMatchMethod)) {
    score += 0.1;
  }

  if (input.totalRigheCount === 0) score -= 0.3;

  score = Math.min(1, Math.max(0, score));
  return { score, level: qualityLevelFromScore(score) };
}

export function importQualityBannerLabel(level: ImportQualityLevel): string {
  switch (level) {
    case "high":
      return "Import affidabile";
    case "medium":
      return "Verificare alcuni dati";
    default:
      return "Controllare attentamente i dati estratti";
  }
}
