import {
  aggiungiMarcaHierarchy,
  aggiungiModelloHierarchy,
  flattenCompatFromHierarchyTree,
  getHierarchyTree,
  marcheFromHierarchyTree,
  modelliVisibiliPerMarcaHierarchy,
  type HierarchyTreeKey,
} from "@/lib/mezzi/hierarchy-list-prefs";
import { syncAddettoColorMapById } from "@/lib/lavorazioni/addetto-colors-assign";
import { createAddettoId } from "@/lib/lavorazioni/addetto-model";
import {
  getAddettiRecords,
  serializeDipendentiRecordsForPayload,
  type DipendenteRecord,
} from "@/lib/dipendenti/dipendente-record";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { prioritaLabel } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import { statoLavorazioneLabel } from "@/lib/lavorazioni/stati-dynamic";
import type { ListSelectItem } from "@/lib/ui/list-select-items";
import type { CSSProperties } from "react";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { mergeFornitoriOrdineOptions } from "@/lib/magazzino/fornitori-ordine-options";
import { registerMarcaInMagazzinoMaster } from "@/lib/magazzino/marca-fornitore-sconto";
import type { CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import type { AppSettingsUpsertInput } from "@/src/services/settings.service";

/** Elenchi piatti persistiti in `app_settings`. */
export type GlobalSettingsFlatListKey =
  | "lavorazioni:addetti"
  | "mezzi:clienti"
  | "mezzi:utilizzatori"
  | "mezzi:cantieri"
  | "mezzi:tipiAttrezzatura"
  | "mezzi:tipiTelaio"
  | "magazzino:categorie"
  | "magazzino:marche"
  | "magazzino:fornitori"
  | "magazzino:fornitoriOrdine"
  | "magazzino:produttori"
  | "magazzino:mezziCompatibili";

export type GlobalSettingsHierarchyKind = "marca" | "modello";

/** Elenchi strutturati (id + label + colore) da impostazioni. */
export type GlobalSettingsStructuredListKey = "lavorazioni:stati" | "lavorazioni:priorita";

export type GlobalSettingsListKey = GlobalSettingsFlatListKey | GlobalSettingsStructuredListKey;

export type GlobalListSelectItem = ListSelectItem & { pillStyle?: CSSProperties };

export function isStructuredListKey(key: GlobalSettingsListKey): key is GlobalSettingsStructuredListKey {
  return key === "lavorazioni:stati" || key === "lavorazioni:priorita";
}

export function listKeyAllowsDynamicAppend(key: GlobalSettingsListKey): boolean {
  return !isStructuredListKey(key);
}

export type GlobalSettingsListContext = {
  hierarchyTree?: HierarchyTreeKey;
  hierarchyKind?: GlobalSettingsHierarchyKind;
  /** Obbligatorio per `hierarchyKind: "modello"` (salvo `modelloBrowseAll`). */
  marcaNome?: string;
  /** Senza marca: elenco «Marca — Modello» su tutto l'albero. */
  modelloBrowseAll?: boolean;
};

export function isHierarchyListContext(ctx?: GlobalSettingsListContext): boolean {
  return Boolean(ctx?.hierarchyTree && ctx.hierarchyKind);
}

function normKey(v: string): string {
  return v.trim().toLowerCase();
}

function appendUniqueSorted(list: string[], value: string): { next: string[]; canonical: string } {
  const t = value.trim();
  if (!t) return { next: list, canonical: "" };
  const hit = list.find((x) => normKey(x) === normKey(t));
  if (hit) return { next: list, canonical: hit };
  return { next: [...list, t].sort((a, b) => a.localeCompare(b, "it")), canonical: t };
}

function pillStyleFromHex(hex: string | undefined): CSSProperties | undefined {
  if (!hex?.trim()) return undefined;
  return {
    backgroundColor: hex,
    color: "#fafafa",
    borderColor: "rgba(255,255,255,0.22)",
  };
}

/** Voci con label/id/colori per stati e priorità. */
export function resolveGlobalListItems(
  resolved: CabAppSettingsResolved,
  listKey: GlobalSettingsStructuredListKey,
): GlobalListSelectItem[] {
  if (listKey === "lavorazioni:stati") {
    return resolved.lavorazioni.stati.map((s) => ({
      value: s.id,
      label: statoLavorazioneLabel(s.id, resolved.lavorazioni.stati),
      pillStyle: pillStyleFromHex(s.color),
    }));
  }
  return orderPrioritaList(resolved.lavorazioni.prioritaDb).map((p) => ({
    value: p,
    label: prioritaLabel(p as PrioritaLav),
    pillStyle: pillStyleFromHex(
      p === "urgente" ? "#b91c1c" : resolved.lavorazioni.prioritaColors[p as PrioritaLav],
    ),
  }));
}

export function resolveGlobalListOptions(
  resolved: CabAppSettingsResolved,
  listKey: GlobalSettingsListKey,
  ctx?: GlobalSettingsListContext,
): string[] {
  if (ctx?.hierarchyTree && ctx.hierarchyKind === "marca") {
    return marcheFromHierarchyTree(resolved.mezziListe, ctx.hierarchyTree);
  }
  if (ctx?.hierarchyTree && ctx.hierarchyKind === "modello") {
    const marca = ctx.marcaNome?.trim() ?? "";
    if (!marca) {
      if (ctx.modelloBrowseAll) {
        return flattenCompatFromHierarchyTree(resolved.mezziListe, ctx.hierarchyTree);
      }
      return [];
    }
    return modelliVisibiliPerMarcaHierarchy(resolved.mezziListe, ctx.hierarchyTree, marca);
  }

  switch (listKey) {
    case "lavorazioni:stati":
    case "lavorazioni:priorita":
      return [];
    case "lavorazioni:addetti":
      return resolved.lavorazioni.addetti;
    case "mezzi:clienti":
      return resolved.mezziListe.clienti;
    case "mezzi:utilizzatori":
      return resolved.mezziListe.utilizzatori;
    case "mezzi:cantieri":
      return resolved.mezziListe.cantieri;
    case "mezzi:tipiAttrezzatura":
      return resolved.mezziListe.tipiAttrezzatura;
    case "mezzi:tipiTelaio":
      return resolved.mezziListe.tipiTelaio ?? [];
    case "magazzino:categorie":
      return resolved.magazzinoMaster.categorie;
    case "magazzino:marche":
      return resolved.magazzinoMaster.marche;
    case "magazzino:fornitori":
      return resolved.magazzinoMaster.fornitori;
    case "magazzino:fornitoriOrdine":
      return mergeFornitoriOrdineOptions(resolved.magazzinoMaster);
    case "magazzino:produttori":
      return resolved.magazzinoMaster.produttori ?? [];
    case "magazzino:mezziCompatibili":
      return resolved.magazzinoMaster.mezziCompatibili;
    default:
      return [];
  }
}

export type AppendGlobalListResult =
  | { ok: true; canonicalValue: string; upsert: AppSettingsUpsertInput }
  | { ok: false; reason: "empty" | "duplicate" | "missing_marca" | "unsupported" };

/** Calcola payload upsert per aggiungere un valore all'elenco globale (senza I/O). */
export function buildAppendGlobalListUpsert(
  resolved: CabAppSettingsResolved,
  listKey: GlobalSettingsListKey,
  rawValue: string,
  ctx?: GlobalSettingsListContext,
): AppendGlobalListResult {
  const value = rawValue.trim();
  if (!value) return { ok: false, reason: "empty" };

  if (ctx?.hierarchyTree && ctx.hierarchyKind === "marca") {
    const tree = ctx.hierarchyTree;
    const existing = marcheFromHierarchyTree(resolved.mezziListe, tree);
    const hit = existing.find((x) => normKey(x) === normKey(value));
    if (hit) return { ok: true, canonicalValue: hit, upsert: mezziListeUpsert(aggiungiMarcaHierarchy(resolved.mezziListe, tree, value)) };
    const nextListe = aggiungiMarcaHierarchy(resolved.mezziListe, tree, value);
    const canonical =
      marcheFromHierarchyTree(nextListe, tree).find((x) => normKey(x) === normKey(value)) ?? value;
    return { ok: true, canonicalValue: canonical, upsert: mezziListeUpsert(nextListe) };
  }

  if (ctx?.hierarchyTree && ctx.hierarchyKind === "modello") {
    const marcaNome = ctx.marcaNome?.trim() ?? "";
    if (!marcaNome) return { ok: false, reason: "missing_marca" };
    const tree = ctx.hierarchyTree;
    const marca = getHierarchyTree(resolved.mezziListe, tree).find((m) => normKey(m.nome) === normKey(marcaNome));
    if (!marca) return { ok: false, reason: "missing_marca" };
    const existing = modelliVisibiliPerMarcaHierarchy(resolved.mezziListe, tree, marcaNome);
    const hit = existing.find((x) => normKey(x) === normKey(value));
    if (hit) return { ok: true, canonicalValue: hit, upsert: mezziListeUpsert(resolved.mezziListe) };
    const nextListe = aggiungiModelloHierarchy(resolved.mezziListe, tree, marca.id, value);
    const canonical =
      modelliVisibiliPerMarcaHierarchy(nextListe, tree, marcaNome).find((x) => normKey(x) === normKey(value)) ??
      value;
    return { ok: true, canonicalValue: canonical, upsert: mezziListeUpsert(nextListe) };
  }

  switch (listKey) {
    case "lavorazioni:addetti": {
      const nome = value.trim();
      if (!nome) return { ok: false, reason: "empty" };
      const dipendentiRecords = [...resolved.dipendenti.dipendentiRecords];
      const addettiRecords = getAddettiRecords(dipendentiRecords);
      const hit = addettiRecords.find((x) => x.nome.trim().toLowerCase() === nome.toLowerCase());
      const lavPrefsBase = {
        stati: resolved.lavorazioni.stati,
        dipendentiRecords: serializeDipendentiRecordsForPayload(dipendentiRecords),
        addettoColors: resolved.lavorazioni.addettoColors,
        prioritaColors: resolved.lavorazioni.prioritaColors,
        prioritaDb: resolved.lavorazioni.prioritaDb,
      };
      if (hit) {
        return {
          ok: true,
          canonicalValue: hit.nome,
          upsert: {
            module: CAB_SETTINGS_MODULE.lavorazioni,
            key: CAB_SETTINGS_KEY.prefs,
            value: lavPrefsBase,
          },
        };
      }
      const newRec: DipendenteRecord = {
        id: createAddettoId(),
        nome,
        cognome: null,
        colorKey: null,
        employeeType: "ADDETTO",
        attivo: true,
      };
      dipendentiRecords.push(newRec);
      const addettiForColors = getAddettiRecords(dipendentiRecords).map((r) => ({
        id: r.id,
        nome: r.nome.trim(),
        cognome: r.cognome?.trim() ? r.cognome.trim() : null,
        colorKey: r.colorKey ?? r.id,
      }));
      return {
        ok: true,
        canonicalValue: nome,
        upsert: {
          module: CAB_SETTINGS_MODULE.lavorazioni,
          key: CAB_SETTINGS_KEY.prefs,
          value: {
            ...lavPrefsBase,
            dipendentiRecords: serializeDipendentiRecordsForPayload(dipendentiRecords),
            addettoColors: syncAddettoColorMapById(addettiForColors, resolved.lavorazioni.addettoColors),
          },
        },
      };
    }
    case "mezzi:clienti":
    case "mezzi:utilizzatori":
    case "mezzi:cantieri":
    case "mezzi:tipiAttrezzatura":
    case "mezzi:tipiTelaio": {
      const field = listKey.split(":")[1] as keyof Pick<
        MezziListePrefs,
        "clienti" | "utilizzatori" | "cantieri" | "tipiAttrezzatura" | "tipiTelaio"
      >;
      const current = (resolved.mezziListe[field] as string[] | undefined) ?? [];
      const { next, canonical } = appendUniqueSorted(current, value);
      if (!canonical) return { ok: false, reason: "empty" };
      return {
        ok: true,
        canonicalValue: canonical,
        upsert: mezziListeUpsert({ ...resolved.mezziListe, [field]: next }),
      };
    }
    case "magazzino:categorie":
    case "magazzino:marche":
    case "magazzino:fornitori":
    case "magazzino:fornitoriOrdine":
    case "magazzino:produttori":
    case "magazzino:mezziCompatibili": {
      const field = listKey.split(":")[1] as
        | "marche"
        | "categorie"
        | "mezziCompatibili"
        | "fornitori"
        | "produttori";
      if (listKey === "magazzino:fornitoriOrdine") {
        const merged = mergeFornitoriOrdineOptions(resolved.magazzinoMaster);
        const hit = merged.find((x) => normKey(x) === normKey(value));
        if (hit) {
          return {
            ok: true,
            canonicalValue: hit,
            upsert: {
              module: CAB_SETTINGS_MODULE.magazzino,
              key: CAB_SETTINGS_KEY.master,
              value: { ...resolved.magazzinoMaster },
            },
          };
        }
        const current = resolved.magazzinoMaster.fornitori ?? [];
        const { next, canonical } = appendUniqueSorted(current, value);
        if (!canonical) return { ok: false, reason: "empty" };
        return {
          ok: true,
          canonicalValue: canonical,
          upsert: {
            module: CAB_SETTINGS_MODULE.magazzino,
            key: CAB_SETTINGS_KEY.master,
            value: { ...resolved.magazzinoMaster, fornitori: next },
          },
        };
      }
      if (listKey === "magazzino:marche") {
        const hit = resolved.magazzinoMaster.marche.find((x) => normKey(x) === normKey(value));
        if (hit) {
          return {
            ok: true,
            canonicalValue: hit,
            upsert: {
              module: CAB_SETTINGS_MODULE.magazzino,
              key: CAB_SETTINGS_KEY.master,
              value: { ...resolved.magazzinoMaster },
            },
          };
        }
        const nextMaster = registerMarcaInMagazzinoMaster(resolved.magazzinoMaster, value);
        const canonical =
          nextMaster.marche.find((x) => normKey(x) === normKey(value)) ?? value.trim();
        return {
          ok: true,
          canonicalValue: canonical,
          upsert: {
            module: CAB_SETTINGS_MODULE.magazzino,
            key: CAB_SETTINGS_KEY.master,
            value: nextMaster,
          },
        };
      }
      const current = resolved.magazzinoMaster[field] ?? [];
      const { next, canonical } = appendUniqueSorted(current, value);
      if (!canonical) return { ok: false, reason: "empty" };
      return {
        ok: true,
        canonicalValue: canonical,
        upsert: {
          module: CAB_SETTINGS_MODULE.magazzino,
          key: CAB_SETTINGS_KEY.master,
          value: { ...resolved.magazzinoMaster, [field]: next },
        },
      };
    }
    case "lavorazioni:stati":
    case "lavorazioni:priorita":
      return { ok: false, reason: "unsupported" };
    default:
      return { ok: false, reason: "unsupported" };
  }
}

function mezziListeUpsert(liste: MezziListePrefs): AppSettingsUpsertInput {
  return {
    module: CAB_SETTINGS_MODULE.mezzi,
    key: CAB_SETTINGS_KEY.liste,
    value: { ...(liste as unknown as Record<string, unknown>) },
  };
}
