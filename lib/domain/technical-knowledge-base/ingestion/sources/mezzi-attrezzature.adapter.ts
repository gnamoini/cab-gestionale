import { ATTREZZATURE_COLUMNS, MEZZI_COLUMNS } from "@/lib/db/table-select-columns";
import { precedenceForSource } from "../../merge/source-precedence";
import type { TkbSourceAdapter } from "../adapter-registry";
import { registerTkbAdapter } from "../adapter-registry";
import { tkbSlugFromLabel } from "../slug";
import type { TkbCompatibilita, TkbIntervento, TkbSourceFragment } from "../../types";

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

export const mezziAttrezzatureAdapter: TkbSourceAdapter = {
  id: "mezzi_attrezzature",
  tier: 1,
  supportsIncremental: true,
  async collect(ctx) {
    const out: TkbSourceFragment[] = [];
    const { data: mezzi } = await ctx.supabase.from("mezzi").select(MEZZI_COLUMNS);
    for (const m of mezzi ?? []) {
      const marca = String(m.marca_telaio ?? "").trim();
      const modello = String(m.modello_telaio ?? "").trim();
      if (!marca && !modello) continue;
      const slug = tkbSlugFromLabel(`${marca} ${modello}`.trim(), m.id);
      const compat: TkbCompatibilita = {
        targetTypes: ["telaio"],
        marche: marca ? [marca] : undefined,
        tipiAttrezzatura: m.tipo_telaio ? [String(m.tipo_telaio)] : undefined,
      };
      const intervento: TkbIntervento = {
        slug,
        label: `Mezzo ${marca} ${modello}`.trim(),
        keywords: [marca, modello, String(m.targa ?? ""), String(m.cliente ?? "")].filter(Boolean),
        compatibilita: compat,
        attivitaPrincipali: [],
      };
      out.push(frag("mezzi_attrezzature", "intervento", slug, intervento, m.id));
    }
    const { data: att } = await ctx.supabase.from("attrezzature").select(ATTREZZATURE_COLUMNS);
    for (const a of att ?? []) {
      const tipo = String(a.tipo_attrezzatura ?? "").trim();
      const marca = String(a.marca ?? "").trim();
      const modello = String(a.modello ?? "").trim();
      const slug = tkbSlugFromLabel(`${tipo} ${marca} ${modello}`.trim(), a.id);
      const intervento: TkbIntervento = {
        slug,
        label: [tipo, marca, modello].filter(Boolean).join(" "),
        keywords: [tipo, marca, modello].filter(Boolean),
        compatibilita: { targetTypes: ["attrezzatura"], tipiAttrezzatura: tipo ? [tipo] : undefined, marche: marca ? [marca] : undefined },
        attivitaPrincipali: [],
      };
      out.push(frag("mezzi_attrezzature", "intervento", slug, intervento, a.id));
    }
    return out;
  },
};

registerTkbAdapter(mezziAttrezzatureAdapter);
