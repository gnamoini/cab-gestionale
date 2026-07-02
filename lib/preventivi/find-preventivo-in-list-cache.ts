import type { QueryClient } from "@tanstack/react-query";
import { getPreventiviRecordsFromCache } from "@/lib/preventivi/preventivi-records-from-cache";
import type { PreventivoRecord } from "@/lib/preventivi/types";

/** Read-only: cerca un preventivo nei record già in cache React Query. */
export function findPreventivoInListCache(
  qc: QueryClient,
  preventivoId: string,
): PreventivoRecord | undefined {
  const id = preventivoId.trim();
  if (!id) return undefined;
  return getPreventiviRecordsFromCache(qc).find((p) => p.id === id);
}
