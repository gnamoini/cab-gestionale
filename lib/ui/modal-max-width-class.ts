/** Corpo modale: flex-1 + min-h-0 dentro dialog a colonna (max-h); il figlio scroll usa overflow-y-auto. */
export const gestionaleModalBodyFlexClass =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-md:flex-none max-md:overflow-visible";

/** Corpo scrollabile modale/drawer — unico owner verticale interno. */
export { dsScrollPanel as gestionaleModalScrollBodyClass } from "@/lib/ui/scroll-system";

export {
  type ModalSize,
  type ModalHeight,
  type DrawerSize,
  type GestionaleModalWidth,
  resolveModalWidthClasses,
  resolveModalHeightClasses,
  resolveShellModalLayout,
  resolveDrawerAsideClasses,
  defaultModalHeightForSize,
} from "@/lib/ui/modal-size-system";

import {
  resolveGestionaleModalWidthFromLegacy,
  resolveModalWidthClasses,
  type GestionaleModalWidth,
} from "@/lib/ui/modal-size-system";

/** Tier standard desktop — alias di `formMedium` (48rem). */
export const gestionaleModalWidthStandard = resolveModalWidthClasses("formMedium");

/** Tier conferma — compatto (28rem). */
export const gestionaleModalWidthConfirmation = resolveModalWidthClasses("confirmation");

/** @deprecated Alias di `gestionaleModalWidthStandard`. */
export const gestionaleModalWidthWide = gestionaleModalWidthStandard;

/** Risolve le classi max-width per un tier gestionale legacy (`standard` → formMedium). */
export function resolveGestionaleModalWidth(
  size: GestionaleModalWidth = "standard",
): string {
  return resolveGestionaleModalWidthFromLegacy(size);
}

/** Prefissa classi max-width per desktop; mobile resta full-bleed (max-md:max-w-none). */
export function resolveModalMaxWidthClass(maxWidthClass?: string, wide?: boolean): string {
  const raw = maxWidthClass ?? (wide ? gestionaleModalWidthStandard : "max-w-lg");
  if (/\bmax-md:/.test(raw) || /\bmd:max-w-/.test(raw)) return raw;
  const parts = raw.split(/\s+/).filter(Boolean);
  const mdParts = parts.map((p) => (p.startsWith("md:") || p.startsWith("max-md:") ? p : `md:${p}`));
  return `max-md:max-w-none ${mdParts.join(" ")}`;
}
