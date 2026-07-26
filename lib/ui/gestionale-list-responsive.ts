import type { GestionaleListTier } from "@/lib/ui/resolve-list-surface";

export type { GestionaleListTier } from "@/lib/ui/resolve-list-surface";

const TIER_VIEWPORT_MQ: Record<GestionaleListTier, string> = {
  xl: "(min-width: 1280px)",
  lg: "(min-width: 1024px)",
  md: "(min-width: 768px)",
};

export function gestionaleListLayoutViewportMq(tier: GestionaleListTier): string {
  return TIER_VIEWPORT_MQ[tier];
}

/** Classe tier statica sul root scroll-scope lista. */
export function gestionaleListTierClass(tier: GestionaleListTier): string {
  return `gestionale-list-tier-${tier} gestionale-list-container`;
}

/** @deprecated Usare listSurface prop — mantenuto per migrazione graduale audit. */
export const GESTIONALE_LIST_DESKTOP_ONLY_CLASS = "gestionale-list-desktop-only";
/** @deprecated Usare listSurface prop */
export const GESTIONALE_LIST_MOBILE_ONLY_CLASS = "gestionale-list-mobile-only";
