/** Corpo modale: flex-1 + min-h-0 dentro dialog a colonna (max-h); il figlio scroll usa overflow-y-auto. */
export const gestionaleModalBodyFlexClass =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-md:flex-none max-md:overflow-visible";

/** Corpo scrollabile modale/drawer — unico owner verticale interno. */
export { dsScrollPanel as gestionaleModalScrollBodyClass } from "@/lib/ui/scroll-system";

/** Prefissa classi max-width per desktop; mobile resta full-bleed (max-md:max-w-none). */
export function resolveModalMaxWidthClass(maxWidthClass?: string, wide?: boolean): string {
  const raw = maxWidthClass ?? (wide ? "max-w-2xl" : "max-w-lg");
  if (/\bmax-md:/.test(raw) || /\bmd:max-w-/.test(raw)) return raw;
  const parts = raw.split(/\s+/).filter(Boolean);
  const mdParts = parts.map((p) => (p.startsWith("md:") || p.startsWith("max-md:") ? p : `md:${p}`));
  return `max-md:max-w-none ${mdParts.join(" ")}`;
}
