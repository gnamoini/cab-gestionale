import type { BunderCommercialDocument } from "@/lib/bunder/types";

/** Snapshot stabile per confronto dirty state editor BUNDER. */
export function bunderDocumentSnapshot(doc: BunderCommercialDocument): string {
  return JSON.stringify(doc);
}

export function isBunderDocumentDirty(
  current: BunderCommercialDocument,
  baselineSnapshot: string,
): boolean {
  return bunderDocumentSnapshot(current) !== baselineSnapshot;
}
