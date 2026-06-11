import { normListSelectValue } from "@/lib/ui/list-select-utils";

/** Tier statici — ordine decrescente di priorità. */
export const RANK_TIER_SELECTED = 10_000;
export const RANK_TIER_RECENT_BASE = 1_000;

export type RankTier = number;

export type RankOptionsContext = {
  selectedValue: string;
  recentValues?: readonly string[];
  query: string;
  listKey?: string;
};

export type RankOverrideFn<T> = (
  item: T,
  ctx: RankOptionsContext & { getValue: (item: T) => string; getLabel: (item: T) => string },
) => RankTier | null;

export type RankOptionsParams<T> = {
  items: readonly T[];
  getValue: (item: T) => string;
  getLabel: (item: T) => string;
  selectedValue: string;
  recentValues?: readonly string[];
  query: string;
  scoreFn?: (query: string, label: string) => number;
  /** Override opzionale per listKey o dominio — null → tier statico. */
  override?: RankOverrideFn<T> | Record<string, RankOverrideFn<T>>;
};

function resolveOverrideFn<T>(
  override: RankOptionsParams<T>["override"],
  listKey?: string,
): RankOverrideFn<T> | undefined {
  if (!override) return undefined;
  if (typeof override === "function") return override;
  if (listKey && override[listKey]) return override[listKey];
  return undefined;
}

function recentRankOffset(valueNorm: string, recentValues: readonly string[], legacy: boolean): number {
  if (legacy) {
    const idx = recentValues.indexOf(valueNorm);
    return idx >= 0 ? RANK_TIER_RECENT_BASE - idx : 0;
  }
  const idx = recentValues.findIndex((r) => normListSelectValue(r) === valueNorm);
  return idx >= 0 ? RANK_TIER_RECENT_BASE - idx : 0;
}

function computeStaticRank<T>(
  item: T,
  getValue: (item: T) => string,
  getLabel: (item: T) => string,
  ctx: RankOptionsContext,
  scoreFn?: (query: string, label: string) => number,
  legacy = false,
): number {
  const value = getValue(item);
  const label = getLabel(item);
  const valueNorm = normListSelectValue(value);
  const selectedNorm = normListSelectValue(ctx.selectedValue);
  const q = ctx.query.trim();

  let rank = 0;
  if (selectedNorm && valueNorm === selectedNorm) rank += RANK_TIER_SELECTED;
  rank += recentRankOffset(valueNorm, ctx.recentValues ?? [], legacy);
  if (q && scoreFn) rank += scoreFn(q, label);
  return rank;
}

/**
 * Ordinamento deterministico: selezionato → recenti → score query → alfabetico.
 * Default tier-based statico; override opzionale per listKey (capability futura).
 */
export function rankOptions<T>(params: RankOptionsParams<T>, opts?: { listKey?: string }): T[] {
  const {
    items,
    getValue,
    getLabel,
    selectedValue,
    recentValues = [],
    query,
    scoreFn,
    override,
  } = params;

  const ctx: RankOptionsContext = { selectedValue, recentValues, query, listKey: opts?.listKey };
  const overrideFn = resolveOverrideFn(override, opts?.listKey);
  const legacy =
    typeof process !== "undefined" &&
    process.env.SELECTOR_RANK_LEGACY === "true";

  const ranked = items.map((item) => {
    const label = getLabel(item);
    const overrideTier = overrideFn?.(item, { ...ctx, getValue, getLabel });
    const rank =
      overrideTier != null
        ? overrideTier
        : computeStaticRank(item, getValue, getLabel, ctx, scoreFn, legacy);
    return { item, rank, label };
  });

  ranked.sort((a, b) => b.rank - a.rank || a.label.localeCompare(b.label, "it"));
  const ordered = ranked.map((x) => x.item);
  const empty: T[] = [];
  const rest: T[] = [];
  for (const item of ordered) {
    if (!getValue(item).trim()) empty.push(item);
    else rest.push(item);
  }
  return [...empty, ...rest];
}

/** @deprecated Usare rankOptions da selector-core. */
export function orderSelectSuggestions<T>(params: RankOptionsParams<T>): T[] {
  return rankOptions(params);
}
