import { APP_SETTINGS_COLUMNS } from "@/lib/db/table-select-columns";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import { resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";
import { precedenceForSource } from "../../merge/source-precedence";
import type { TkbIngestionContext } from "../adapter-types";
import type { TkbSourceAdapter } from "../adapter-registry";
import { registerTkbAdapter } from "../adapter-registry";
import { tkbSlugFromLabel } from "../slug";
import type { TkbCategoria, TkbComponente, TkbSourceFragment } from "../../types";

function frag(
  sourceId: string,
  entityKind: TkbSourceFragment["entityKind"],
  entityKey: string,
  payload: unknown,
): TkbSourceFragment {
  return {
    sourceId,
    precedence: precedenceForSource(sourceId),
    entityKind,
    entityKey,
    payload,
    provenance: { origin: sourceId },
  };
}

export const appSettingsListeAdapter: TkbSourceAdapter = {
  id: "app_settings_liste",
  tier: 1,
  supportsIncremental: true,
  async collect(ctx) {
    const { data } = await ctx.supabase
      .from("app_settings")
      .select(APP_SETTINGS_COLUMNS)
      .eq("module", CAB_SETTINGS_MODULE.mezzi)
      .eq("key", CAB_SETTINGS_KEY.liste);
    const liste = resolveCabAppSettingsFromRows(data ?? []).mezziListe;
    const out: TkbSourceFragment[] = [];
    let sort = 0;
    for (const stato of liste.stati ?? []) {
      const slug = tkbSlugFromLabel(stato);
      const cat: TkbCategoria = { slug, label: stato, sortOrder: sort++ };
      out.push(frag("app_settings_liste", "categoria", slug, cat));
    }
    for (const tipo of liste.tipiAttrezzatura ?? []) {
      const slug = tkbSlugFromLabel(tipo);
      const comp: TkbComponente = { slug, label: tipo, synonyms: ["attrezzatura", tipo] };
      out.push(frag("cataloghi_tecnici", "componente", slug, comp));
    }
    for (const marca of liste.marche ?? []) {
      const slug = tkbSlugFromLabel(marca);
      out.push(frag("cataloghi_tecnici", "componente", slug, { slug, label: marca, synonyms: [marca] } satisfies TkbComponente));
    }
    for (const tree of [liste.attrezzature, liste.telai]) {
      for (const m of tree ?? []) {
        const mSlug = tkbSlugFromLabel(m.nome);
        out.push(
          frag("cataloghi_tecnici", "componente", mSlug, {
            slug: mSlug,
            label: m.nome,
            synonyms: m.modelli?.map((x) => x.nome) ?? [],
          } satisfies TkbComponente),
        );
        for (const mod of m.modelli ?? []) {
          const modSlug = tkbSlugFromLabel(`${m.nome} ${mod.nome}`);
          out.push(
            frag("cataloghi_tecnici", "componente", modSlug, {
              slug: modSlug,
              label: mod.nome,
              synonyms: [m.nome, mod.nome],
            } satisfies TkbComponente),
          );
        }
      }
    }
    return out;
  },
};

registerTkbAdapter(appSettingsListeAdapter);
