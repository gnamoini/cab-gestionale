import type { PreventivoStatoCliente, PreventivoStatoWorkflow } from "@/lib/preventivi/types";

/** SSOT visibilità portale cliente — mirror di is_preventivo_visible_to_client SQL. */
export function isPreventivoVisibleToClient(
  workflow: PreventivoStatoWorkflow,
  cliente: PreventivoStatoCliente | null,
  inviatoAt?: string | null,
): boolean {
  if (!inviatoAt) return false;
  if (workflow === "inviato" || workflow === "acquisito") return true;
  if (cliente === "pending" || cliente === "accettato" || cliente === "rifiutato") return true;
  return false;
}
