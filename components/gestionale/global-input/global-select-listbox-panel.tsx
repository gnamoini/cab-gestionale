import { globalAutocompleteDropdownPortalPanel } from "@/lib/ui/global-input";

/** Classi pannello dropdown listbox GlobalSelect — SSOT split bundle. */
export function globalSelectDropdownPanelClass(placementOriginClass: string): string {
  return `${globalAutocompleteDropdownPortalPanel} p-1 ${placementOriginClass} min-h-0 overflow-y-auto overscroll-y-contain`;
}
