import type { QuerySurface } from "@/lib/selector-core/types";

/** Derivato da focus context — mai persistito come state. */
export function deriveQuerySurface(
  activeElement: HTMLElement | null,
  sheetSearchRef: HTMLElement | null,
): QuerySurface {
  if (activeElement && sheetSearchRef && activeElement === sheetSearchRef) {
    return "sheet";
  }
  return "trigger";
}
