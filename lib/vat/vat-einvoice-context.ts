import type { DocumentFiscalContext, EsigibilitaIva, VatConfiguration } from "@/lib/vat/types";

/** Resolve EsigibilitaIVA from config + document context (not from VAT code alone). */
export function resolveEsigibilitaIva(
  _configuration: VatConfiguration,
  documentContext: DocumentFiscalContext,
): EsigibilitaIva {
  if (documentContext.esigibilita_iva) {
    return documentContext.esigibilita_iva;
  }
  if (documentContext.split_payment) {
    return "S";
  }
  return "I";
}
