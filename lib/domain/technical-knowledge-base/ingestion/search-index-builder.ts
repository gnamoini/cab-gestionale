import type { TkbDraftBundle, TkbPublishedSnapshot, TkbSearchIndex } from "../types";

export function buildSearchIndex(bundle: TkbDraftBundle): TkbSearchIndex {
  const keywordToInterventi: Record<string, string[]> = {};
  const componentToInterventi: Record<string, string[]> = {};
  const synonymToComponentSlug: Record<string, string> = {};
  const activityById: TkbSearchIndex["activityById"] = {};

  const addKw = (kw: string, slug: string) => {
    const k = kw.trim().toLowerCase();
    if (!k) return;
    const list = keywordToInterventi[k] ?? [];
    if (!list.includes(slug)) list.push(slug);
    keywordToInterventi[k] = list;
  };

  for (const c of bundle.componenti) {
    synonymToComponentSlug[c.label.toLowerCase()] = c.slug;
    for (const s of c.synonyms ?? []) {
      synonymToComponentSlug[s.toLowerCase()] = c.slug;
    }
  }

  for (const i of bundle.interventi) {
    addKw(i.label, i.slug);
    for (const kw of i.keywords) addKw(kw, i.slug);
    for (const cs of i.componentiSlugs ?? []) {
      const list = componentToInterventi[cs] ?? [];
      if (!list.includes(i.slug)) list.push(i.slug);
      componentToInterventi[cs] = list;
    }
    for (const a of [
      ...i.attivitaPrincipali,
      ...(i.attivitaComplementari ?? []),
      ...(i.controlliFinali ?? []),
    ]) {
      activityById[a.activityId] = { interventoSlug: i.slug, activity: a };
      addKw(a.text, i.slug);
    }
  }

  return { keywordToInterventi, componentToInterventi, synonymToComponentSlug, activityById };
}

export function searchIndexFromSnapshot(snapshot: TkbPublishedSnapshot): TkbSearchIndex | undefined {
  return snapshot.searchIndex;
}
