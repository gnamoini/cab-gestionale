import type { PreventivoRecord, PreventivoStato } from "@/lib/preventivi/types";

/** Valori lifecycle default per nuove bozze preventivo. */
export const PREVENTIVO_LIFECYCLE_DEFAULTS: Pick<
  PreventivoRecord,
  "stato" | "statoWorkflow" | "statoCliente" | "versione"
> = {
  stato: "bozza",
  statoWorkflow: "bozza",
  statoCliente: null,
  versione: 1,
};

/** Migrazione localStorage legacy `stato` → dual-state. */
export function legacyPreventivoStatoToLifecycle(
  stato: PreventivoStato,
): Pick<PreventivoRecord, "statoWorkflow" | "statoCliente" | "versione"> {
  switch (stato) {
    case "inviato":
      return { statoWorkflow: "inviato", statoCliente: "pending", versione: 1 };
    case "confermato":
      return { statoWorkflow: "acquisito", statoCliente: "accettato", versione: 1 };
    case "annullato":
      return { statoWorkflow: "annullato", statoCliente: null, versione: 1 };
    default:
      return { statoWorkflow: "bozza", statoCliente: null, versione: 1 };
  }
}
