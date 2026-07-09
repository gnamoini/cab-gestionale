/**
 * Quadratura partite: fattura ↔ open item ↔ allocazioni.
 */

export function invoiceResidualMatchesOpenItem(
  residuo: number,
  remainingSigned: number,
  tolerance = 0.02,
): boolean {
  return Math.abs(Math.abs(remainingSigned) - residuo) <= tolerance;
}

export function invoiceTotalMatchesPaidPlusResidual(
  totale: number,
  pagato: number,
  residuo: number,
  tolerance = 0.02,
): boolean {
  return Math.abs(totale - (pagato + residuo)) <= tolerance;
}

export function customerAccountingBalance(
  invoiceDebits: number,
  creditNotes: number,
  advances: number,
): number {
  return invoiceDebits + creditNotes + advances;
}
