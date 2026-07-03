import type { List, Page } from "@/lib/domain/list-types";

/** Stable pure function — hook ONLY caller (R-5). */
export function flattenPages<T>(pages: readonly Page<T>[]): List<T> {
  return pages.flatMap((p) => p.rows);
}
