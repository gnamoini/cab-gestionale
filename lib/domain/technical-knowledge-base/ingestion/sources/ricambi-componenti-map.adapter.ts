import type { TkbSourceAdapter } from "../adapter-registry";
import { registerTkbAdapter } from "../adapter-registry";

/** Relazioni esplicite ricambio→componente da DB (se popolato). */
export const ricambiComponentiMapAdapter: TkbSourceAdapter = {
  id: "ricambi_componenti_map",
  tier: 2,
  supportsIncremental: true,
  async collect(ctx) {
    const { data, error } = await ctx.supabase
      .from("ricambi_componenti_map")
      .select("id, ricambio_id, componente_slug, azione_prevista, activity_id, match_confidence, match_quality, active")
      .eq("active", true);
    if (error) {
      ctx.warnings.push(`ricambi_componenti_map:${error.message}`);
      return [];
    }
    const out = [];
    for (const row of data ?? []) {
      const entry = {
        id: String(row.id),
        ricambioId: String(row.ricambio_id),
        componenteSlug: String(row.componente_slug),
        azionePrevista: row.azione_prevista as "sostituzione" | "installazione" | "revisione",
        activityId: String(row.activity_id),
        matchConfidence: Number(row.match_confidence ?? 1),
        matchQuality: row.match_quality as "certain" | "partial" | "needs_review",
        active: true,
        validFrom: ctx.now.slice(0, 10),
      };
      out.push({
        sourceId: "ricambi_componenti_map",
        precedence: 50,
        entityKind: "ricambioMap" as const,
        entityKey: entry.id,
        payload: entry,
        provenance: { origin: "ricambi_componenti_map", recordId: entry.id },
      });
    }
    return out;
  },
};

registerTkbAdapter(ricambiComponentiMapAdapter);
