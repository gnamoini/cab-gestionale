import type {
  CatalogActivity,
  TkbCategoria,
  TkbComponente,
  TkbDraftBundle,
  TkbIntervento,
  TkbProcedure,
  TkbRicambioMapEntry,
  TkbSintomo,
} from "./types";

/** Slug TKB: lowercase snake, no doppi underscore. */
export function canonicalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function canonicalizeString(s: string): string {
  return s.trim().normalize("NFC").replace(/\s+/g, " ");
}

function canonicalizeStringArray(arr: string[] | undefined): string[] | undefined {
  if (!arr?.length) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const s = canonicalizeString(raw);
    const key = s.toLowerCase();
    if (!s || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  out.sort((a, b) => a.localeCompare(b, "it"));
  return out.length ? out : undefined;
}

function canonicalizeActivity(a: CatalogActivity): CatalogActivity {
  return {
    activityId: canonicalizeSlug(a.activityId),
    text: canonicalizeString(a.text),
    sort: a.sort,
    required: a.required,
    includeInStandard: a.includeInStandard,
    activityType: a.activityType,
    componenteSlugs: canonicalizeStringArray(a.componenteSlugs)?.map(canonicalizeSlug),
  };
}

function canonicalizeComponente(c: TkbComponente): TkbComponente {
  return {
    slug: canonicalizeSlug(c.slug),
    label: canonicalizeString(c.label),
    categoriaSlug: c.categoriaSlug ? canonicalizeSlug(c.categoriaSlug) : undefined,
    synonyms: canonicalizeStringArray(c.synonyms),
  };
}

function canonicalizeSintomo(s: TkbSintomo): TkbSintomo {
  return {
    slug: canonicalizeSlug(s.slug),
    label: canonicalizeString(s.label),
    keywords: canonicalizeStringArray(s.keywords) ?? [],
    relatedComponentiSlugs: canonicalizeStringArray(s.relatedComponentiSlugs)?.map(canonicalizeSlug),
  };
}

function canonicalizeCategoria(c: TkbCategoria): TkbCategoria {
  return {
    slug: canonicalizeSlug(c.slug),
    label: canonicalizeString(c.label),
    sortOrder: c.sortOrder,
  };
}

function canonicalizeProcedure(p: TkbProcedure): TkbProcedure {
  return {
    slug: canonicalizeSlug(p.slug),
    label: canonicalizeString(p.label),
    categoriaSlug: p.categoriaSlug ? canonicalizeSlug(p.categoriaSlug) : undefined,
    attivita: [...p.attivita].map(canonicalizeActivity).sort((a, b) => a.sort - b.sort || a.activityId.localeCompare(b.activityId)),
    controlliFinali: p.controlliFinali
      ?.map(canonicalizeActivity)
      .sort((a, b) => a.sort - b.sort || a.activityId.localeCompare(b.activityId)),
    publishStatus: p.publishStatus,
  };
}

function canonicalizeIntervento(i: TkbIntervento): TkbIntervento {
  return {
    slug: canonicalizeSlug(i.slug),
    label: canonicalizeString(i.label),
    categoriaSlug: i.categoriaSlug ? canonicalizeSlug(i.categoriaSlug) : undefined,
    keywords: canonicalizeStringArray(i.keywords) ?? [],
    componentiSlugs: canonicalizeStringArray(i.componentiSlugs)?.map(canonicalizeSlug),
    sintomiSlugs: canonicalizeStringArray(i.sintomiSlugs)?.map(canonicalizeSlug),
    compatibilita: i.compatibilita,
    procedureSlugs: canonicalizeStringArray(i.procedureSlugs)?.map(canonicalizeSlug),
    activityOverrides: i.activityOverrides,
    attivitaPrincipali: [...i.attivitaPrincipali]
      .map(canonicalizeActivity)
      .sort((a, b) => a.sort - b.sort || a.activityId.localeCompare(b.activityId)),
    attivitaComplementari: i.attivitaComplementari
      ?.map(canonicalizeActivity)
      .sort((a, b) => a.sort - b.sort || a.activityId.localeCompare(b.activityId)),
    controlliFinali: i.controlliFinali
      ?.map(canonicalizeActivity)
      .sort((a, b) => a.sort - b.sort || a.activityId.localeCompare(b.activityId)),
    publishStatus: i.publishStatus,
  };
}

function canonicalizeRicambioMap(m: TkbRicambioMapEntry): TkbRicambioMapEntry {
  return {
    ...m,
    componenteSlug: canonicalizeSlug(m.componenteSlug),
    activityId: canonicalizeSlug(m.activityId),
  };
}

function sortBySlug<T extends { slug: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.slug.localeCompare(b.slug, "it"));
}

/** Normalizza draft per hash deterministico (strippa buildReport). */
export function canonicalizeDraftBundle(bundle: TkbDraftBundle): TkbDraftBundle {
  return {
    componenti: sortBySlug(bundle.componenti.map(canonicalizeComponente)),
    sintomi: sortBySlug(bundle.sintomi.map(canonicalizeSintomo)),
    categorie: sortBySlug(bundle.categorie.map(canonicalizeCategoria)).sort(
      (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.slug.localeCompare(b.slug, "it"),
    ),
    procedure: sortBySlug(bundle.procedure.map(canonicalizeProcedure)),
    interventi: sortBySlug(bundle.interventi.map(canonicalizeIntervento)),
    ricambiMap: [...bundle.ricambiMap]
      .map(canonicalizeRicambioMap)
      .sort((a, b) => a.id.localeCompare(b.id) || a.ricambioId.localeCompare(b.ricambioId)),
  };
}
