import type { PreventivoStato } from "@/lib/preventivi/types";

/** SSOT visibilità portale cliente — mirror di is_preventivo_visible_to_client SQL. */
export function isPreventivoVisibleToClient(stato: PreventivoStato): boolean {
  return stato === "inviato" || stato === "confermato";
}
