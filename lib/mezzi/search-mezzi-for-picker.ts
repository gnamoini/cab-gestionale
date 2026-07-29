import { filterMezziGestiti } from "@/lib/mezzi/mezzi-list-fetch";
import { readMezzoSelectionRecents } from "@/lib/mezzi/mezzo-selection-recents";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { buildSearchDocumentMezzo } from "@/lib/search/builders/build-search-document-mezzo";
import { matchSearchString } from "@/lib/search/match";
import { normalizeSearchText } from "@/lib/search/normalize";
import {
  entityAutocompleteKey,
  normalizeEntityString,
} from "@/lib/validation/global-entity-validation";

export const MEZZO_PICKER_SEARCH_RENDER_MAX = 50;
export const MEZZO_PICKER_IDLE_FALLBACK_MAX = 20;

export type MezzoPickerListItem =
  | { kind: "section"; label: string; count?: number; sectionId: string }
  | { kind: "mezzo"; mezzo: MezzoGestito; score: number; navigableIndex: number };

export type MezzoPickerSearchResult = {
  items: MezzoPickerListItem[];
  /** Solo righe mezzo — per Enter su singolo risultato. */
  navigableMezzi: MezzoGestito[];
  queryTrimmed: string;
  hasSearchQuery: boolean;
};

type RankedMezzo = { mezzo: MezzoGestito; score: number };

function compareMezziRecency(a: MezzoGestito, b: MezzoGestito): number {
  const aTs = a.ultimaModifica?.trim() ?? "";
  const bTs = b.ultimaModifica?.trim() ?? "";
  if (aTs && bTs && aTs !== bTs) return bTs.localeCompare(aTs);
  return a.id.localeCompare(b.id);
}

function rankMezziForQuery(catalog: readonly MezzoGestito[], query: string): RankedMezzo[] {
  const q = query.trim();
  if (!q) return [];
  const filtered = filterMezziGestiti([...catalog], { search: q });
  const ranked = filtered.map((mezzo) => ({
    mezzo,
    score: matchSearchString(q, buildSearchDocumentMezzo(mezzo)).score,
  }));
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return compareMezziRecency(a.mezzo, b.mezzo);
  });
  return ranked.slice(0, MEZZO_PICKER_SEARCH_RENDER_MAX);
}

function isIdentLikeQuery(query: string, ranked: RankedMezzo[]): boolean {
  const qKey = entityAutocompleteKey(query);
  if (!qKey || qKey.length < 4) return false;
  if (ranked.length > 2) return false;
  return ranked.every(({ mezzo }) => {
    const keys = [mezzo.targa, mezzo.matricola, mezzo.vin, mezzo.numeroScuderia]
      .map((v) => entityAutocompleteKey(v ?? ""))
      .filter(Boolean);
    return keys.some((k) => k === qKey || k.includes(qKey) || qKey.includes(k));
  });
}

function clienteMatchesQuery(cliente: string, query: string): boolean {
  const q = normalizeEntityString(query);
  if (!q) return false;
  const c = normalizeEntityString(cliente);
  if (!c) return false;
  if (c.includes(q)) return true;
  return entityAutocompleteKey(c).includes(entityAutocompleteKey(q));
}

function buildClienteGroupedItems(ranked: RankedMezzo[]): MezzoPickerListItem[] {
  const byCliente = new Map<string, RankedMezzo[]>();
  for (const row of ranked) {
    const key = row.mezzo.cliente.trim() || "—";
    const list = byCliente.get(key);
    if (list) list.push(row);
    else byCliente.set(key, [row]);
  }
  if (byCliente.size === 0 || byCliente.size > 3) return [];

  const items: MezzoPickerListItem[] = [];
  let navigableIndex = 0;
  for (const [cliente, rows] of byCliente) {
    if (rows.length < 2) continue;
    items.push({
      kind: "section",
      sectionId: `cliente:${cliente}`,
      label: cliente,
      count: rows.length,
    });
    for (const row of rows) {
      items.push({ kind: "mezzo", mezzo: row.mezzo, score: row.score, navigableIndex });
      navigableIndex += 1;
    }
  }
  return items.length > 0 ? items : [];
}

function buildFlatMezzoItems(ranked: RankedMezzo[]): MezzoPickerListItem[] {
  return ranked.map((row, navigableIndex) => ({
    kind: "mezzo" as const,
    mezzo: row.mezzo,
    score: row.score,
    navigableIndex,
  }));
}

function resolveIdleMezzi(
  catalog: readonly MezzoGestito[],
  recentIds: readonly string[],
): MezzoGestito[] {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const out: MezzoGestito[] = [];
  const seen = new Set<string>();

  for (const id of recentIds) {
    const m = byId.get(id);
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
    if (out.length >= MEZZO_PICKER_IDLE_FALLBACK_MAX) return out;
  }

  const fallback = [...catalog].sort(compareMezziRecency);
  for (const m of fallback) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
    if (out.length >= MEZZO_PICKER_IDLE_FALLBACK_MAX) return out;
  }
  return out;
}

function buildIdleItems(
  catalog: readonly MezzoGestito[],
  recentIds: readonly string[],
): MezzoPickerListItem[] {
  const idle = resolveIdleMezzi(catalog, recentIds);
  if (idle.length === 0) return [];

  const recentSet = new Set(recentIds);
  const recentMezzi = idle.filter((m) => recentSet.has(m.id));
  const otherMezzi = idle.filter((m) => !recentSet.has(m.id));

  const items: MezzoPickerListItem[] = [];
  let navigableIndex = 0;

  if (recentMezzi.length > 0) {
    items.push({ kind: "section", sectionId: "recenti", label: "Recenti", count: recentMezzi.length });
    for (const mezzo of recentMezzi) {
      items.push({ kind: "mezzo", mezzo, score: 0, navigableIndex });
      navigableIndex += 1;
    }
  }

  if (otherMezzi.length > 0) {
    const label = recentMezzi.length > 0 ? "Ultimi aggiornati" : "Mezzi in anagrafica";
    items.push({
      kind: "section",
      sectionId: "ultimi",
      label,
      count: otherMezzi.length,
    });
    for (const mezzo of otherMezzi) {
      items.push({ kind: "mezzo", mezzo, score: 0, navigableIndex });
      navigableIndex += 1;
    }
  }

  return items;
}

export function buildMezzoPickerListItems(
  catalog: readonly MezzoGestito[],
  query: string,
  options?: { recentIds?: readonly string[]; userId?: string | null },
): MezzoPickerListItem[] {
  const q = query.trim();
  const recentIds = options?.recentIds ?? readMezzoSelectionRecents(options?.userId);

  if (!q) {
    return buildIdleItems(catalog, recentIds);
  }

  const ranked = rankMezziForQuery(catalog, q);
  if (ranked.length === 0) return [];

  const clienteHits = ranked.filter((r) => clienteMatchesQuery(r.mezzo.cliente, q));
  const shouldGroupByCliente =
    !isIdentLikeQuery(q, ranked) &&
    clienteHits.length >= 3 &&
    new Set(clienteHits.map((r) => normalizeSearchText(r.mezzo.cliente))).size <= 3;

  if (shouldGroupByCliente) {
    const grouped = buildClienteGroupedItems(ranked);
    if (grouped.length > 0) return grouped;
  }

  return buildFlatMezzoItems(ranked);
}

export function searchMezziForPicker(
  catalog: readonly MezzoGestito[],
  query: string,
  options?: { recentIds?: readonly string[]; userId?: string | null },
): MezzoPickerSearchResult {
  const items = buildMezzoPickerListItems(catalog, query, options);
  const navigableMezzi = items
    .filter((item): item is Extract<MezzoPickerListItem, { kind: "mezzo" }> => item.kind === "mezzo")
    .map((item) => item.mezzo);

  return {
    items,
    navigableMezzi,
    queryTrimmed: query.trim(),
    hasSearchQuery: query.trim().length > 0,
  };
}

/** ponytail: helper per test/UI — Enter apre direttamente se un solo mezzo navigabile. */
export function resolveSingleMezzoPickerEnter(
  result: MezzoPickerSearchResult,
): MezzoGestito | null {
  if (result.navigableMezzi.length !== 1) return null;
  return result.navigableMezzi[0] ?? null;
}
