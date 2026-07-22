/** Compact bulk label request item — persisted in async jobs. */
export type BulkLabelCompactItem = {
  id: string;
  quantity: number;
  preset?: string;
};

export const BULK_QUANTITY_MIN = 1;
export const BULK_QUANTITY_MAX = 99;
export const BULK_UNIQUE_MAX = 200;

export function totalBulkLabelCount(items: readonly BulkLabelCompactItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Expand compact items to print order (in memory only). */
export function expandLabelItemsForRender<T extends { id: string }>(
  compact: readonly BulkLabelCompactItem[],
  resolve: (id: string) => T | undefined,
): T[] {
  const out: T[] = [];
  for (const item of compact) {
    const resolved = resolve(item.id);
    if (!resolved) continue;
    for (let i = 0; i < item.quantity; i++) {
      out.push(resolved);
    }
  }
  return out;
}

/** Unique entity ids from compact items (for token batch / DB lookup). */
export function uniqueBulkEntityIds(items: readonly BulkLabelCompactItem[]): string[] {
  return [...new Set(items.map((item) => item.id))];
}

/** Normalize legacy uuid[] job storage to compact items. */
export function parseJobBulkItems(raw: unknown): BulkLabelCompactItem[] {
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    const first = raw[0];
    if (typeof first === "object" && first !== null && "id" in first && "quantity" in first) {
      return raw
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const o = entry as Record<string, unknown>;
          const id = typeof o.id === "string" ? o.id : "";
          const quantity = Number(o.quantity);
          if (!id || !Number.isFinite(quantity) || quantity < BULK_QUANTITY_MIN) return null;
          return {
            id,
            quantity: Math.min(BULK_QUANTITY_MAX, Math.floor(quantity)),
            ...(typeof o.preset === "string" ? { preset: o.preset } : {}),
          } satisfies BulkLabelCompactItem;
        })
        .filter((item): item is BulkLabelCompactItem => item !== null);
    }
    if (typeof first === "string") {
      return (raw as string[]).map((id) => ({ id, quantity: 1 }));
    }
  }
  return [];
}
