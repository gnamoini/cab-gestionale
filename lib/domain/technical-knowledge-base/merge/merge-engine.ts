import { canonicalizeSlug } from "../canonicalize";
import { precedenceForSource } from "./source-precedence";
import type {
  CatalogActivity,
  TkbCategoria,
  TkbComponente,
  TkbDraftBundle,
  TkbEntityKind,
  TkbIntervento,
  TkbProcedure,
  TkbRicambioMapEntry,
  TkbSintomo,
  TkbSourceFragment,
} from "../types";

export type MergeResult = {
  bundle: TkbDraftBundle;
  audit: {
    performed: number;
    duplicatesFound: number;
    conflictsResolved: number;
    added: number;
    updated: number;
    removed: number;
  };
};

type EntityBucket = {
  categoria: Map<string, TkbCategoria>;
  componente: Map<string, TkbComponente>;
  sintomo: Map<string, TkbSintomo>;
  procedure: Map<string, TkbProcedure>;
  intervento: Map<string, TkbIntervento>;
  ricambioMap: Map<string, TkbRicambioMapEntry>;
};

type StoredFragment = TkbSourceFragment & { precedence: number; updatedAt?: string };

function bucketKey(kind: TkbEntityKind, key: string): string {
  return `${kind}:${canonicalizeSlug(key)}`;
}

function mergeStringArrays(a?: string[], b?: string[]): string[] | undefined {
  const set = new Set<string>();
  for (const arr of [a, b]) {
    if (!arr) continue;
    for (const s of arr) {
      const t = s.trim();
      if (t) set.add(t);
    }
  }
  const out = [...set].sort((x, y) => x.localeCompare(y, "it"));
  return out.length ? out : undefined;
}

function mergeComponente(existing: TkbComponente, incoming: TkbComponente): TkbComponente {
  return {
    slug: existing.slug,
    label: incoming.label || existing.label,
    categoriaSlug: incoming.categoriaSlug ?? existing.categoriaSlug,
    synonyms: mergeStringArrays(existing.synonyms, incoming.synonyms),
  };
}

function mergeSintomo(existing: TkbSintomo, incoming: TkbSintomo): TkbSintomo {
  return {
    slug: existing.slug,
    label: incoming.label || existing.label,
    keywords: mergeStringArrays(existing.keywords, incoming.keywords) ?? [],
    relatedComponentiSlugs: mergeStringArrays(existing.relatedComponentiSlugs, incoming.relatedComponentiSlugs),
  };
}

function mergeIntervento(existing: TkbIntervento, incoming: TkbIntervento): TkbIntervento {
  return {
    slug: existing.slug,
    label: incoming.label || existing.label,
    categoriaSlug: incoming.categoriaSlug ?? existing.categoriaSlug,
    keywords: mergeStringArrays(existing.keywords, incoming.keywords) ?? [],
    componentiSlugs: mergeStringArrays(existing.componentiSlugs, incoming.componentiSlugs),
    sintomiSlugs: mergeStringArrays(existing.sintomiSlugs, incoming.sintomiSlugs),
    compatibilita: incoming.compatibilita ?? existing.compatibilita,
    procedureSlugs: mergeStringArrays(existing.procedureSlugs, incoming.procedureSlugs),
    activityOverrides: incoming.activityOverrides ?? existing.activityOverrides,
    attivitaPrincipali:
      incoming.attivitaPrincipali.length > 0 ? incoming.attivitaPrincipali : existing.attivitaPrincipali,
    attivitaComplementari: incoming.attivitaComplementari ?? existing.attivitaComplementari,
    controlliFinali: incoming.controlliFinali ?? existing.controlliFinali,
    publishStatus: existing.publishStatus,
  };
}

function activityCount(bundle: TkbDraftBundle): number {
  let n = 0;
  for (const p of bundle.procedure) {
    n += p.attivita.length + (p.controlliFinali?.length ?? 0);
  }
  for (const i of bundle.interventi) {
    n +=
      i.attivitaPrincipali.length +
      (i.attivitaComplementari?.length ?? 0) +
      (i.controlliFinali?.length ?? 0);
  }
  return n;
}

function toBuckets(fragments: StoredFragment[]): EntityBucket {
  const buckets: EntityBucket = {
    categoria: new Map(),
    componente: new Map(),
    sintomo: new Map(),
    procedure: new Map(),
    intervento: new Map(),
    ricambioMap: new Map(),
  };

  const stored = new Map<string, StoredFragment>();
  let duplicatesFound = 0;
  let conflictsResolved = 0;
  let performed = 0;
  let added = 0;
  let updated = 0;

  for (const frag of fragments) {
    const key = bucketKey(frag.entityKind, frag.entityKey);
    const existing = stored.get(key);
    if (!existing) {
      stored.set(key, frag);
      added++;
      continue;
    }
    duplicatesFound++;
    const win =
      frag.precedence > existing.precedence
        ? frag
        : frag.precedence < existing.precedence
          ? existing
          : (frag.updatedAt ?? "") >= (existing.updatedAt ?? "")
            ? frag
            : existing;
    if (win !== existing) conflictsResolved++;
    stored.set(key, win);
    updated++;
    performed++;
  }

  for (const frag of stored.values()) {
    const slug = canonicalizeSlug(frag.entityKey);
    switch (frag.entityKind) {
      case "categoria":
        buckets.categoria.set(slug, frag.payload as TkbCategoria);
        break;
      case "componente": {
        const incoming = frag.payload as TkbComponente;
        const prev = buckets.componente.get(slug);
        buckets.componente.set(slug, prev ? mergeComponente(prev, incoming) : incoming);
        break;
      }
      case "sintomo": {
        const incoming = frag.payload as TkbSintomo;
        const prev = buckets.sintomo.get(slug);
        buckets.sintomo.set(slug, prev ? mergeSintomo(prev, incoming) : incoming);
        break;
      }
      case "procedure":
        buckets.procedure.set(slug, frag.payload as TkbProcedure);
        break;
      case "intervento": {
        const incoming = frag.payload as TkbIntervento;
        const prev = buckets.intervento.get(slug);
        buckets.intervento.set(slug, prev ? mergeIntervento(prev, incoming) : incoming);
        break;
      }
      case "ricambioMap": {
        const entry = frag.payload as TkbRicambioMapEntry;
        buckets.ricambioMap.set(entry.id, entry);
        break;
      }
      default:
        break;
    }
  }

  return buckets;
}

export function mergeFragments(fragments: TkbSourceFragment[]): MergeResult {
  const stored: StoredFragment[] = fragments.map((f) => ({
    ...f,
    precedence: f.precedence || precedenceForSource(f.sourceId),
    updatedAt: f.provenance.updatedAt,
  }));

  const buckets = toBuckets(stored);
  const bundle: TkbDraftBundle = {
    categorie: [...buckets.categoria.values()],
    componenti: [...buckets.componente.values()],
    sintomi: [...buckets.sintomo.values()],
    procedure: [...buckets.procedure.values()],
    interventi: [...buckets.intervento.values()],
    ricambiMap: [...buckets.ricambioMap.values()],
  };

  return {
    bundle,
    audit: {
      performed: stored.length,
      duplicatesFound: Math.max(0, stored.length - new Set(stored.map((s) => bucketKey(s.entityKind, s.entityKey))).size),
      conflictsResolved: 0,
      added: bundle.categorie.length + bundle.componenti.length + bundle.interventi.length,
      updated: 0,
      removed: 0,
    },
  };
}

export function countActivities(bundle: TkbDraftBundle): number {
  return activityCount(bundle);
}

export function emptyDraftBundle(): TkbDraftBundle {
  return {
    categorie: [],
    componenti: [],
    sintomi: [],
    procedure: [],
    interventi: [],
    ricambiMap: [],
  };
}

/** Merge conservativo: union di array su draft esistente per incremental patch. */
export function patchDraftFromFragments(
  previous: TkbDraftBundle,
  fragments: TkbSourceFragment[],
): MergeResult {
  const merged = mergeFragments([...fragmentsFromDraft(previous), ...fragments]);
  return merged;
}

function fragmentsFromDraft(draft: TkbDraftBundle): TkbSourceFragment[] {
  const out: TkbSourceFragment[] = [];
  const base = { sourceId: "draft_cache", precedence: 5, provenance: { origin: "draft_cache" } };
  for (const c of draft.categorie) {
    out.push({ ...base, entityKind: "categoria", entityKey: c.slug, payload: c });
  }
  for (const c of draft.componenti) {
    out.push({ ...base, entityKind: "componente", entityKey: c.slug, payload: c });
  }
  for (const s of draft.sintomi) {
    out.push({ ...base, entityKind: "sintomo", entityKey: s.slug, payload: s });
  }
  for (const p of draft.procedure) {
    out.push({ ...base, entityKind: "procedure", entityKey: p.slug, payload: p });
  }
  for (const i of draft.interventi) {
    out.push({ ...base, entityKind: "intervento", entityKey: i.slug, payload: i });
  }
  for (const m of draft.ricambiMap) {
    out.push({ ...base, entityKind: "ricambioMap", entityKey: m.id, payload: m });
  }
  return out;
}

export function makeActivity(
  activityId: string,
  text: string,
  sort: number,
  activityType: CatalogActivity["activityType"],
  required = true,
): CatalogActivity {
  return { activityId, text, sort, required, activityType };
}
