import { LAVORAZIONI_COLUMNS } from "@/lib/db/table-select-columns";
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
  provenance: TkbSourceFragment["provenance"],
): TkbSourceFragment {
  return {
    sourceId,
    precedence: precedenceForSource(sourceId),
    entityKind,
    entityKey,
    payload,
    provenance,
  };
}

export const lavorazioniStructuredAdapter: TkbSourceAdapter = {
  id: "lavorazioni_structured",
  tier: 2,
  supportsIncremental: true,
  async collect(ctx) {
    const { data, error } = await ctx.supabase
      .from("lavorazioni")
      .select(LAVORAZIONI_COLUMNS)
      .is("deleted_at", null)
      .eq("archived", false);
    if (error) {
      ctx.warnings.push(`lavorazioni:${error.message}`);
      return [];
    }
    const out: TkbSourceFragment[] = [];
    for (const row of data ?? []) {
      const note = String(row.note ?? "").trim();
      const stato = String(row.stato ?? "").trim();
      const label = note || `Lavorazione ${row.codice ?? row.id}`;
      const slug = tkbSlugFromLabel(label, row.id);
      const intervento: TkbIntervento = {
        slug,
        label,
        categoriaSlug: stato ? tkbSlugFromLabel(stato) : undefined,
        keywords: [note, stato, String(row.codice ?? "")].filter(Boolean),
        compatibilita: row.target_type
          ? { targetTypes: [row.target_type as "telaio" | "attrezzatura"] }
          : undefined,
        attivitaPrincipali: note
          ? [
              makeActivity(
                activityIdFromText(note, "lav"),
                note,
                10,
                "diagnosi",
              ),
            ]
          : [],
      };
      out.push(
        frag("lavorazioni_structured", "intervento", slug, intervento, {
          origin: "lavorazioni",
          recordId: row.id,
          updatedAt: row.updated_at ?? undefined,
        }),
      );
    }
    return out;
  },
};

registerTkbAdapter(lavorazioniStructuredAdapter);
