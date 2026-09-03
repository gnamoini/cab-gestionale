export type ItemMapping = {
  cabItemId: string;
  unoerpItemId: string;
  cabCode: string | null;
};

export function resolveMappedItem(opts: {
  mapping: ItemMapping | null;
  currentCabCode: string | null;
}): { ok: true; unoerpItemId: string } | { ok: false; code: "UNOERP_ITEM_MAPPING_MISSING" | "UNOERP_ITEM_IDENTITY_DRIFT" } {
  if (!opts.mapping) return { ok: false, code: "UNOERP_ITEM_MAPPING_MISSING" };
  const a = (opts.mapping.cabCode ?? "").trim().toUpperCase();
  const b = (opts.currentCabCode ?? "").trim().toUpperCase();
  if (a && b && a !== b) return { ok: false, code: "UNOERP_ITEM_IDENTITY_DRIFT" };
  return { ok: true, unoerpItemId: opts.mapping.unoerpItemId };
}
