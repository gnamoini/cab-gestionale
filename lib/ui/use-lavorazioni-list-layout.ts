"use client";

import {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
  gestionaleListLayoutClassName,
  gestionaleListLayoutViewportMq,
  resolveGestionaleListLayout,
  type GestionaleListLayout,
  useGestionaleListLayout,
} from "@/lib/ui/use-gestionale-list-layout";

export {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
  gestionaleListLayoutClassName as lavorazioniListLayoutClassName,
};

export const LAVORAZIONI_LIST_DESKTOP_MIN_VIEWPORT = 1280;
export const LAVORAZIONI_LIST_DESKTOP_MIN_CONTAINER = 1024;
export const LAVORAZIONI_LIST_DESKTOP_VIEWPORT_MQ = gestionaleListLayoutViewportMq("xl");

export type LavorazioniListLayout = GestionaleListLayout;

export function resolveLavorazioniListLayout(viewportWidth: number, containerWidth: number): LavorazioniListLayout {
  return resolveGestionaleListLayout("xl", viewportWidth, containerWidth);
}

export function useLavorazioniListLayout() {
  return useGestionaleListLayout({ tier: "xl" });
}
