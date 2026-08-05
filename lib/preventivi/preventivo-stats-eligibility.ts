import type { PreventivoMetodoAccettazione, PreventivoStatoCliente } from "@/lib/preventivi/types";

export function isPreventivoCountedInEconomicStats(p: {
  statoCliente: PreventivoStatoCliente | null;
}): boolean {
  return p.statoCliente === "accettato";
}

/** Decisioni cliente chiuse — esclude pending, ritirati, annullati. */
export function isClosedCustomerDecision(p: {
  statoCliente: PreventivoStatoCliente | null;
}): boolean {
  return p.statoCliente === "accettato" || p.statoCliente === "rifiutato";
}

export function isPreventivoInCommercialFunnel(p: {
  statoWorkflow: string;
  statoCliente: PreventivoStatoCliente | null;
  inviatoAt?: string | null;
}): boolean {
  if (p.inviatoAt) return true;
  return (
    p.statoWorkflow === "inviato" ||
    p.statoWorkflow === "acquisito" ||
    p.statoCliente === "rifiutato"
  );
}

export function isPreventivoTimeoutAccepted(p: {
  statoCliente: PreventivoStatoCliente | null;
  metodoAccettazione: PreventivoMetodoAccettazione | null;
}): boolean {
  return p.statoCliente === "accettato" && p.metodoAccettazione === "timeout_automatico";
}
