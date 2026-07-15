import { findAddettoByStoredName, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { marcheFromHierarchyTree, modelliVisibiliPerMarcaHierarchy } from "@/lib/mezzi/hierarchy-list-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { findExactEntityInPool } from "@/lib/validation/global-entity-validation";
import type {
  GlobalSettingsListContext,
  GlobalSettingsListKey,
} from "@/src/lib/global-list/global-settings-list-keys";
import type { CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";
import { DEFAULT_CAB_BRANDING_SETTINGS } from "@/lib/branding/branding-settings-model";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { SchedaIngressoFields } from "@/types/schede";

export type SchedaIngressoUnknownSettingItem = {
  fieldKey: keyof SchedaIngressoFields;
  label: string;
  value: string;
  listKey: GlobalSettingsListKey;
  ctx?: GlobalSettingsListContext;
};

function safeTrim(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function poolStrings(items: readonly unknown[]): string[] {
  return items.map((x) => (typeof x === "string" ? safeTrim(x) : "")).filter(Boolean);
}

function flatListPool(listKey: GlobalSettingsListKey, liste: MezziListePrefs): string[] {
  switch (listKey) {
    case "mezzi:clienti":
      return poolStrings(liste.clienti);
    case "mezzi:utilizzatori":
      return poolStrings(liste.utilizzatori);
    case "mezzi:cantieri":
      return poolStrings(liste.cantieri);
    case "mezzi:tipiAttrezzatura":
      return poolStrings(liste.tipiAttrezzatura);
    case "mezzi:tipiTelaio":
      return poolStrings(liste.tipiTelaio ?? []);
    default:
      return [];
  }
}

function isUnknownInPool(value: string, pool: readonly string[]): boolean {
  if (!value || pool.length === 0) return false;
  return !findExactEntityInPool(value, pool);
}

function settingsResolvedFromGlobalOpts(opts: GlobalOptionsSlice): CabAppSettingsResolved {
  return {
    lavorazioni: {
      stati: opts.lavorazioni.stati,
      addettiRecords: opts.lavorazioni.addettiRecords,
      addetti: opts.lavorazioni.addetti,
      addettoColors: opts.lavorazioni.addettoColors,
      prioritaColors: opts.lavorazioni.prioritaColors,
      prioritaDb: opts.lavorazioni.prioritaDb,
    },
    mezziListe: opts.mezziListe,
    magazzinoMaster: opts.magazzinoMaster,
    preventiviDefaults: opts.preventiviDefaults,
    dipendenti: opts.dipendenti,
    branding: DEFAULT_CAB_BRANDING_SETTINGS,
  };
}

type Rule = {
  fieldKey: keyof SchedaIngressoFields;
  label: string;
  listKey: GlobalSettingsListKey;
  ctx?: (fields: SchedaIngressoFields) => GlobalSettingsListContext | undefined;
  skip?: (fields: SchedaIngressoFields) => boolean;
};

const RULES: Rule[] = [
  { fieldKey: "cliente", label: "Cliente", listKey: "mezzi:clienti" },
  { fieldKey: "cantiere", label: "Cantiere", listKey: "mezzi:cantieri" },
  { fieldKey: "utilizzatore", label: "Utilizzatore", listKey: "mezzi:utilizzatori" },
  { fieldKey: "tipoAttrezzatura", label: "Tipo attrezzatura", listKey: "mezzi:tipiAttrezzatura" },
  {
    fieldKey: "marcaAttrezzatura",
    label: "Marca attrezzatura",
    listKey: "mezzi:clienti",
    ctx: () => ({ hierarchyTree: "attrezzature", hierarchyKind: "marca" }),
    skip: (f) => !safeTrim(f.marcaAttrezzatura),
  },
  {
    fieldKey: "modelloAttrezzatura",
    label: "Modello attrezzatura",
    listKey: "mezzi:clienti",
    ctx: (f) => ({
      hierarchyTree: "attrezzature",
      hierarchyKind: "modello",
      marcaNome: f.marcaAttrezzatura,
    }),
    skip: (f) => !safeTrim(f.modelloAttrezzatura) || !safeTrim(f.marcaAttrezzatura),
  },
  { fieldKey: "tipoTelaio", label: "Tipo telaio", listKey: "mezzi:tipiTelaio" },
  {
    fieldKey: "marcaTelaio",
    label: "Marca telaio",
    listKey: "mezzi:clienti",
    ctx: () => ({ hierarchyTree: "telai", hierarchyKind: "marca" }),
    skip: (f) => !safeTrim(f.marcaTelaio),
  },
  {
    fieldKey: "modelloTelaio",
    label: "Modello telaio",
    listKey: "mezzi:clienti",
    ctx: (f) => ({
      hierarchyTree: "telai",
      hierarchyKind: "modello",
      marcaNome: f.marcaTelaio,
    }),
    skip: (f) => !safeTrim(f.modelloTelaio) || !safeTrim(f.marcaTelaio),
  },
  { fieldKey: "addettoAccettazione", label: "Addetto accettazione", listKey: "lavorazioni:addetti" },
];

function unknownAddetto(value: string, records: readonly AddettoRecord[]): boolean {
  if (!value || value === "—" || records.length === 0) return false;
  return !findAddettoByStoredName(records, value);
}

function isGlobalOptionsSlice(
  settings: CabAppSettingsResolved | GlobalOptionsSlice,
): settings is GlobalOptionsSlice {
  return "isLoading" in settings;
}

/** ponytail: O(rules) scan; upgrade = condividere regole con capture-catalog-validation se divergono. */
export function listSchedaIngressoUnknownSettings(
  fields: SchedaIngressoFields,
  settings: CabAppSettingsResolved | GlobalOptionsSlice,
): SchedaIngressoUnknownSettingItem[] {
  const resolved = isGlobalOptionsSlice(settings)
    ? settingsResolvedFromGlobalOpts(settings)
    : settings;

  const out: SchedaIngressoUnknownSettingItem[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    if (rule.skip?.(fields)) continue;
    const value = safeTrim(String(fields[rule.fieldKey] ?? ""));
    if (!value) continue;

    if (rule.listKey === "lavorazioni:addetti") {
      if (!unknownAddetto(value, resolved.lavorazioni.addettiRecords)) continue;
    } else {
      const ctx = rule.ctx?.(fields);
      const pool =
        ctx?.hierarchyTree && ctx.hierarchyKind === "marca"
          ? marcheFromHierarchyTree(resolved.mezziListe, ctx.hierarchyTree)
          : ctx?.hierarchyTree && ctx.hierarchyKind === "modello" && ctx.marcaNome?.trim()
            ? modelliVisibiliPerMarcaHierarchy(resolved.mezziListe, ctx.hierarchyTree, ctx.marcaNome)
            : flatListPool(rule.listKey, resolved.mezziListe);
      if (!isUnknownInPool(value, pool)) continue;
    }

    const dedupeKey = `${rule.listKey}:${rule.ctx ? JSON.stringify(rule.ctx(fields)) : ""}:${value.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    out.push({
      fieldKey: rule.fieldKey,
      label: rule.label,
      value,
      listKey: rule.listKey,
      ctx: rule.ctx?.(fields),
    });
  }

  return out;
}

export function applyCanonicalValuesToSchedaIngresso(
  fields: SchedaIngressoFields,
  canonicalByField: Partial<Record<keyof SchedaIngressoFields, string>>,
): SchedaIngressoFields {
  const next = { ...fields };
  for (const [key, value] of Object.entries(canonicalByField) as Array<[keyof SchedaIngressoFields, string]>) {
    if (value?.trim()) next[key] = value.trim() as never;
  }
  return next;
}
