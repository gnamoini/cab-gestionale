import { SCHEDA_LAVORAZIONE_COLUMNS } from "@/lib/db/table-select-columns";
import { precedenceForSource } from "../../merge/source-precedence";
import type { TkbIngestionContext } from "../adapter-types";
import type { TkbSourceAdapter } from "../adapter-registry";
import { registerTkbAdapter } from "../adapter-registry";
import { tkbSlugFromLabel } from "../slug";
import type { TkbSintomo, TkbSourceFragment } from "../../types";

function frag(
  sourceId: string,
  entityKind: TkbSourceFragment["entityKind"],
  entityKey: string,
  payload: unknown,
  recordId?: string,
): TkbSourceFragment {
  return {
    sourceId,
    precedence: precedenceForSource(sourceId),
    entityKind,
    entityKey,
    payload,
    provenance: { origin: sourceId, recordId },
  };
}

export const schedeStructuredAdapter: TkbSourceAdapter = {
  id: "schede_lavorazione",
  tier: 3,
  supportsIncremental: true,
  async collect(ctx) {
    const { data, error } = await ctx.supabase.from("scheda_lavorazione").select(SCHEDA_LAVORAZIONE_COLUMNS);
    if (error) {
      ctx.warnings.push(`schede:${error.message}`);
      return [];
    }
    const out: TkbSourceFragment[] = [];
    for (const row of data ?? []) {
      if (row.tipo !== "ingresso") continue;
      const contenuto = (row.contenuto ?? {}) as { doc?: { campi?: { descrizioneAnomalia?: string } } };
      const anomalia = String(contenuto.doc?.campi?.descrizioneAnomalia ?? "").trim();
      if (!anomalia) continue;
      const slug = tkbSlugFromLabel(anomalia, row.id);
      const sintomo: TkbSintomo = {
        slug,
        label: anomalia.slice(0, 120),
        keywords: anomalia.toLowerCase().split(/\s+/).filter((w) => w.length >= 3),
      };
      out.push(frag("schede_lavorazione", "sintomo", slug, sintomo, row.id));
    }
    return out;
  },
};

registerTkbAdapter(schedeStructuredAdapter);
