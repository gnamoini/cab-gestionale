import { PREVENTIVI_COLUMNS } from "@/lib/db/table-select-columns";
import { precedenceForSource } from "../../merge/source-precedence";
import type { TkbIngestionContext } from "../adapter-types";
import type { TkbSourceAdapter } from "../adapter-registry";
import { registerTkbAdapter } from "../adapter-registry";
import { tkbSlugFromLabel, activityIdFromText } from "../slug";
import { makeActivity } from "../../merge/merge-engine";
import type { TkbIntervento, TkbSourceFragment } from "../../types";

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

export const preventiviStructuredAdapter: TkbSourceAdapter = {
  id: "preventivi_consolidated",
  tier: 4,
  supportsIncremental: true,
  async collect(ctx) {
    const { data, error } = await ctx.supabase.from("preventivi").select(PREVENTIVI_COLUMNS);
    if (error) {
      ctx.warnings.push(`preventivi:${error.message}`);
      return [];
    }
    const out: TkbSourceFragment[] = [];
    for (const row of data ?? []) {
      const det = (row.dettagli ?? {}) as Record<string, unknown>;
      const tech = String(det.descrizioneLavorazioniTecnicaSorgente ?? "").trim();
      const client = String(det.descrizioneLavorazioniCliente ?? "").trim();
      if (!tech || !client) continue;
      const slug = tkbSlugFromLabel(tech, row.id);
      const lines = client
        .split("\n")
        .map((l) => l.replace(/^-\s*/, "").trim())
        .filter(Boolean);
      const intervento: TkbIntervento = {
        slug,
        label: tech.slice(0, 120),
        keywords: tech.split(/[+;,\n]+/).map((s) => s.trim()).filter(Boolean),
        attivitaPrincipali: lines.map((text, i) =>
          makeActivity(activityIdFromText(text, "prev"), text, (i + 1) * 10, "sostituzione"),
        ),
      };
      out.push(frag("preventivi_consolidated", "intervento", slug, intervento, row.id));
    }
    return out;
  },
};

registerTkbAdapter(preventiviStructuredAdapter);
