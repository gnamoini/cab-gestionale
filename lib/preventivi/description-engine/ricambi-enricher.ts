import type { TkbIntervento, TkbPublishedSnapshot, TkbRicambioMapEntry } from "@/lib/domain/technical-knowledge-base/types";
import type { ConfidenceTier, GeneratedDescriptionLine } from "./types";

function mapValidOnDate(map: TkbRicambioMapEntry, at: Date): boolean {
  if (!map.active) return false;
  const from = new Date(map.validFrom);
  if (from > at) return false;
  if (map.validTo) {
    const to = new Date(map.validTo);
    if (to < at) return false;
  }
  return true;
}

function defaultLineFromMap(map: TkbRicambioMapEntry): string {
  if (map.lineTemplate?.trim()) return map.lineTemplate.trim();
  const verb =
    map.azionePrevista === "installazione"
      ? "Installazione"
      : map.azionePrevista === "revisione"
        ? "Revisione"
        : "Sostituzione";
  const label = map.componenteSlug.replace(/_/g, " ");
  return `${verb} ${label}`;
}

export function enrichFromRicambiMap(opts: {
  snapshot: TkbPublishedSnapshot;
  intervento: TkbIntervento | null;
  interventoMatchScore: number;
  confidenceTier: ConfidenceTier;
  ricambi: { ricambioId: string | null; descrizione: string; codice: string }[];
  existingActivityIds: Set<string>;
  sortStart: number;
  at?: Date;
}): GeneratedDescriptionLine[] {
  const {
    snapshot,
    intervento,
    interventoMatchScore,
    confidenceTier,
    ricambi,
    existingActivityIds,
    sortStart,
    at = new Date(),
  } = opts;

  if (!intervento) return [];

  const componenti = new Set(intervento.componentiSlugs ?? []);
  const out: GeneratedDescriptionLine[] = [];
  let sort = sortStart;

  for (const r of ricambi) {
    if (!r.ricambioId) continue;
    const maps = snapshot.ricambiMap.filter(
      (m) => m.ricambioId === r.ricambioId && mapValidOnDate(m, at) && componenti.has(m.componenteSlug),
    );

    for (const map of maps) {
      if (existingActivityIds.has(map.activityId)) continue;

      if (map.matchQuality === "needs_review" || map.matchConfidence < 0.5) continue;
      if (map.matchQuality === "partial" && confidenceTier !== "high") continue;
      if (map.matchQuality === "certain" && map.matchConfidence < 0.85 && confidenceTier === "low") continue;

      const lineConfidence = Math.min(1, interventoMatchScore * map.matchConfidence);
      out.push({
        activityId: map.activityId,
        text: defaultLineFromMap(map),
        sourceType: "tkb_ricambio_map",
        sourceId: map.id,
        confidence: Math.round(lineConfidence * 1000) / 1000,
        isVerifiedTechnical: true,
        sort: sort++,
        metadata: {
          matchConfidence: map.matchConfidence,
          matchQuality: map.matchQuality,
          ricambioId: r.ricambioId,
        },
      });
      existingActivityIds.add(map.activityId);
    }
  }

  return out;
}
