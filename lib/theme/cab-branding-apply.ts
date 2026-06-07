import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import type { CabBrandingSettings } from "@/lib/branding/branding-settings-model";
import { isBrandingCustomized } from "@/lib/branding/branding-settings-model";
import { derivePrimaryHover } from "@/lib/theme/cab-branding-derive";

const PRIMARY_VAR = "--cab-primary";
const PRIMARY_HOVER_VAR = "--cab-primary-hover";
const SELECT_CHEVRON_VAR = "--cab-select-chevron-accent";

function buildSelectChevronDataUrl(primaryHex: string): string {
  const hex = normalizeHex(primaryHex) ?? "#ff6633";
  const encoded = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${hex}'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2.25' d='M19 9l-7 7-7-7'/></svg>`,
  );
  return `url("data:image/svg+xml,${encoded}")`;
}

export function applyBrandingToDocument(settings: CabBrandingSettings | null | undefined): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!isBrandingCustomized(settings)) {
    root.style.removeProperty(PRIMARY_VAR);
    root.style.removeProperty(PRIMARY_HOVER_VAR);
    root.style.removeProperty(SELECT_CHEVRON_VAR);
    return;
  }
  const primary = normalizeHex(settings?.primaryColor);
  if (primary) {
    root.style.setProperty(PRIMARY_VAR, primary);
    root.style.setProperty(PRIMARY_HOVER_VAR, derivePrimaryHover(primary));
    root.style.setProperty(SELECT_CHEVRON_VAR, buildSelectChevronDataUrl(primary));
  } else {
    root.style.removeProperty(PRIMARY_VAR);
    root.style.removeProperty(PRIMARY_HOVER_VAR);
    root.style.removeProperty(SELECT_CHEVRON_VAR);
  }
}
