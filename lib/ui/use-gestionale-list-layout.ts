/**
 * @deprecated Usare `listSurface` da `resolve-list-surface` + `gestionaleListTierClass`.
 * Re-export shim per import legacy — nessun hook layout.
 */
export {
  gestionaleListTierClass,
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
  type GestionaleListTier,
} from "@/lib/ui/gestionale-list-responsive";

export type { ListSurface } from "@/lib/ui/resolve-list-surface";
