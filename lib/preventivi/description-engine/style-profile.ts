import type { DetailLevel } from "./types";

export type DescriptionStyleProfile = {
  defaultDetailLevel: DetailLevel;
  preferredVerbs: string[];
  blacklistPatterns: string[];
  bulletPrefix: string;
  maxLines: { compact: number; standard: number; technical: number };
  autoInsertFinalChecks: boolean;
};

export const DEFAULT_STYLE_PROFILE: DescriptionStyleProfile = {
  defaultDetailLevel: "standard",
  preferredVerbs: ["Smontaggio", "Sostituzione", "Ripristino", "Controllo", "Verifica"],
  blacklistPatterns: [
    "è stato effettuato",
    "si procede con",
    "intervento volto a",
    "intervento di sostituzione componente",
  ],
  bulletPrefix: "- ",
  maxLines: { compact: 6, standard: 10, technical: 14 },
  autoInsertFinalChecks: true,
};

export function resolveDetailLevel(explicit?: DetailLevel): DetailLevel {
  return explicit ?? DEFAULT_STYLE_PROFILE.defaultDetailLevel;
}

export function applyStyleBlacklist(text: string, profile = DEFAULT_STYLE_PROFILE): string {
  let out = text;
  for (const pat of profile.blacklistPatterns) {
    if (out.toLowerCase().includes(pat)) {
      out = out.replace(new RegExp(pat, "gi"), "").trim();
    }
  }
  return out;
}

export function truncateToMaxLines(
  lineCount: number,
  detailLevel: DetailLevel,
  profile = DEFAULT_STYLE_PROFILE,
): boolean {
  return lineCount <= profile.maxLines[detailLevel];
}
