import { precedenceForSource } from "../../merge/source-precedence";
import type { TkbSourceAdapter } from "../adapter-registry";
import { registerTkbAdapter } from "../adapter-registry";
import { activityIdFromText, tkbSlugFromLabel } from "../slug";
import { makeActivity } from "../../merge/merge-engine";
import type { TkbIntervento, TkbSourceFragment } from "../../types";

export const descriptionGenerationAdapter: TkbSourceAdapter = {
  id: "description_generation",
  tier: 4,
  supportsIncremental: true,
  async collect(ctx) {
    const { data, error } = await ctx.supabase
      .from("description_generation_lines")
      .select("activity_id, text, source_id, is_verified_technical, generation_id")
      .eq("is_verified_technical", true);
    if (error) {
      ctx.warnings.push(`description_generation:${error.message}`);
      return [];
    }
    const bySource = new Map<string, { texts: string[]; activityIds: string[] }>();
    for (const row of data ?? []) {
      const sid = String(row.source_id ?? "gen");
      const bucket = bySource.get(sid) ?? { texts: [], activityIds: [] };
      bucket.texts.push(String(row.text ?? ""));
      if (row.activity_id) bucket.activityIds.push(String(row.activity_id));
      bySource.set(sid, bucket);
    }
    const out: TkbSourceFragment[] = [];
    for (const [sourceId, bucket] of bySource) {
      const label = bucket.texts[0] ?? sourceId;
      const slug = tkbSlugFromLabel(label, sourceId);
      const intervento: TkbIntervento = {
        slug,
        label,
        keywords: bucket.texts,
        attivitaPrincipali: bucket.texts.map((text, i) =>
          makeActivity(
            bucket.activityIds[i] ?? activityIdFromText(text, "gen"),
            text,
            (i + 1) * 10,
            "controllo",
          ),
        ),
      };
      out.push({
        sourceId: "description_generation",
        precedence: precedenceForSource("description_generation"),
        entityKind: "intervento",
        entityKey: slug,
        payload: intervento,
        provenance: { origin: "description_generation_lines", recordId: sourceId },
      });
    }
    return out;
  },
};

registerTkbAdapter(descriptionGenerationAdapter);
