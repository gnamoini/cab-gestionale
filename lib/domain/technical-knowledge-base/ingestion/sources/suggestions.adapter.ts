import { precedenceForSource } from "../../merge/source-precedence";
import type { TkbSourceAdapter } from "../adapter-registry";
import { registerTkbAdapter } from "../adapter-registry";
import { tkbSlugFromLabel } from "../slug";
import type { TkbIntervento, TkbSourceFragment } from "../../types";

export const suggestionsAdapter: TkbSourceAdapter = {
  id: "suggestions_approved",
  tier: 4,
  supportsIncremental: true,
  async collect(ctx) {
    const { data, error } = await ctx.supabase
      .from("preventivi_description_suggestions")
      .select("id, technical_source_norm, suggested_to, kb_entry_slug")
      .eq("status", "approved");
    if (error) {
      ctx.warnings.push(`suggestions:${error.message}`);
      return [];
    }
    const out: TkbSourceFragment[] = [];
    for (const row of data ?? []) {
      const tech = String(row.technical_source_norm ?? "").trim();
      const to = String(row.suggested_to ?? "").trim();
      if (!tech || !to) continue;
      const slug = row.kb_entry_slug ? String(row.kb_entry_slug) : tkbSlugFromLabel(tech, row.id);
      const intervento: TkbIntervento = {
        slug,
        label: tech.slice(0, 120),
        keywords: [tech, to],
        attivitaPrincipali: [],
      };
      out.push({
        sourceId: "suggestions_approved",
        precedence: precedenceForSource("suggestions_approved"),
        entityKind: "intervento",
        entityKey: slug,
        payload: intervento,
        provenance: { origin: "preventivi_description_suggestions", recordId: row.id },
      });
    }
    return out;
  },
};

registerTkbAdapter(suggestionsAdapter);
