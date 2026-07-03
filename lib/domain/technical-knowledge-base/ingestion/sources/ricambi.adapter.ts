import { MAGAZZINO_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";
import { precedenceForSource } from "../../merge/source-precedence";
import type { TkbIngestionContext } from "../adapter-types";
import type { TkbSourceAdapter } from "../adapter-registry";
import { registerTkbAdapter } from "../adapter-registry";
import { activityIdFromText, tkbSlugFromLabel } from "../slug";
import type { TkbComponente, TkbRicambioMapEntry, TkbSourceFragment } from "../../types";

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

export const ricambiAdapter: TkbSourceAdapter = {
  id: "ricambi",
  tier: 1,
  supportsIncremental: true,
  async collect(ctx) {
    const { data, error } = await ctx.supabase.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS);
    if (error) {
      ctx.warnings.push(`ricambi:query:${error.message}`);
      return [];
    }
    const rows = data ?? [];
    const out: TkbSourceFragment[] = [];
    let sort = 0;
    for (const row of rows) {
      const nome = String(row.nome ?? "").trim();
      if (!nome) {
        ctx.excluded.invalid++;
        continue;
      }
      const slug = tkbSlugFromLabel(nome, row.id);
      const comp: TkbComponente = {
        slug,
        label: nome,
        synonyms: [String(row.marca ?? "").trim(), String(row.codice ?? "").trim()].filter(Boolean),
      };
      out.push(
        frag("ricambi", "componente", slug, comp, {
          origin: "magazzino_ricambi",
          recordId: row.id,
          updatedAt: row.updated_at ?? undefined,
        }),
      );
      const mapEntry: TkbRicambioMapEntry = {
        id: `rm_${row.id}`,
        ricambioId: row.id,
        componenteSlug: slug,
        azionePrevista: "sostituzione",
        activityId: activityIdFromText(`sostituzione ${nome}`, "ric"),
        matchConfidence: 0.85,
        matchQuality: "partial",
        active: true,
        validFrom: (row.created_at ?? ctx.now).slice(0, 10),
      };
      out.push(
        frag("ricambi", "ricambioMap", mapEntry.id, mapEntry, {
          origin: "magazzino_ricambi",
          recordId: row.id,
          updatedAt: row.updated_at ?? undefined,
        }),
      );
      sort++;
    }
    return out;
  },
  async collectIncremental(ctx, hints) {
    const ids = hints.filter((h) => h.entityType === "magazzino_ricambi").map((h) => h.entityId);
    if (!ids.length) return this.collect(ctx);
    const { data } = await ctx.supabase.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS).in("id", ids);
    const partial = { ...ctx, mode: "full" as const };
    const all = await this.collect(partial);
    const idSet = new Set(ids);
    return all.filter((f) => f.provenance.recordId && idSet.has(f.provenance.recordId));
  },
};

registerTkbAdapter(ricambiAdapter);
