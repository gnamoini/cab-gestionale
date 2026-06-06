/** Corpo modale: flex-1 + min-h-0 dentro dialog a colonna (max-h); il figlio scroll usa overflow-y-auto. */
export const gestionaleModalBodyFlexClass =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-md:flex-none max-md:overflow-visible";

/** Corpo scrollabile modale/drawer — unico owner verticale interno. */
export { dsScrollPanel as gestionaleModalScrollBodyClass } from "@/lib/ui/scroll-system";

/** Tier standard desktop — 48rem fissi (non shrink-to-content), cap max-w-3xl. */
export const gestionaleModalWidthStandard =
  "max-md:max-w-none md:min-w-[48rem] md:max-w-3xl";

/** @deprecated Alias di `gestionaleModalWidthStandard` — un solo tier desktop. */
export const gestionaleModalWidthWide = gestionaleModalWidthStandard;

export type GestionaleModalWidth = "standard" | "wide";

/** Risolve le classi max-width per un tier gestionale (SSOT). `wide` è deprecato → sempre standard. */
export function resolveGestionaleModalWidth(
  _size: GestionaleModalWidth = "standard",
): string {
  return gestionaleModalWidthStandard;
}

/** Prefissa classi max-width per desktop; mobile resta full-bleed (max-md:max-w-none). */
export function resolveModalMaxWidthClass(maxWidthClass?: string, wide?: boolean): string {
  const raw = maxWidthClass ?? (wide ? gestionaleModalWidthStandard : "max-w-lg");
  if (/\bmax-md:/.test(raw) || /\bmd:max-w-/.test(raw)) return raw;
  const parts = raw.split(/\s+/).filter(Boolean);
  const mdParts = parts.map((p) => (p.startsWith("md:") || p.startsWith("max-md:") ? p : `md:${p}`));
  return `max-md:max-w-none ${mdParts.join(" ")}`;
}
