import type {
  PreventivoMetodoAccettazione,
  PreventivoStato,
  PreventivoStatoCliente,
  PreventivoStatoWorkflow,
} from "@/lib/preventivi/types";
import type { PreventivoRow } from "@/src/types/supabase-tables";

export function resolvePreventivoStatoWorkflow(row: PreventivoRow): PreventivoStatoWorkflow {
  if (row.stato_workflow) return row.stato_workflow;
  if (row.stato === "confermato") return "acquisito";
  return (row.stato ?? "bozza") as PreventivoStatoWorkflow;
}

export function resolvePreventivoStatoCliente(row: PreventivoRow): PreventivoStatoCliente | null {
  if (row.stato_cliente != null) return row.stato_cliente;
  if (row.stato === "inviato") return "pending";
  if (row.stato === "confermato") return "accettato";
  return null;
}

/** Legacy `stato` field for gradual migration. */
export function resolvePreventivoLegacyStato(row: PreventivoRow): PreventivoStato {
  const wf = resolvePreventivoStatoWorkflow(row);
  if (wf === "acquisito") return "confermato";
  return wf;
}

export function resolvePreventivoMetodoAccettazione(
  row: PreventivoRow,
): PreventivoMetodoAccettazione | null {
  return row.metodo_accettazione ?? null;
}
