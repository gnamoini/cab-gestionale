/**
 * @deprecated Usare tier statico + listSurface. Re-export costanti tier xl.
 */
export {
  gestionaleListLayoutViewportMq,
  gestionaleListTierClass,
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
} from "@/lib/ui/gestionale-list-responsive";

import { gestionaleListLayoutViewportMq } from "@/lib/ui/gestionale-list-responsive";

export const LAVORAZIONI_LIST_DESKTOP_VIEWPORT_MQ = gestionaleListLayoutViewportMq("xl");

/** @deprecated Non usare — layout da listSurface server-side. */
export function useLavorazioniListLayout(): never {
  throw new Error("useLavorazioniListLayout is removed — pass listSurface from page props");
}
