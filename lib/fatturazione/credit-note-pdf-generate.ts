import { generateInvoicePdfBytes, invoicePdfFileName } from "@/lib/fatturazione/invoice-pdf-generate";
import type { InvoiceDetail } from "@/lib/fatturazione/types";

export function generateCreditNotePdfBytes(detail: InvoiceDetail, logoDataUrl: string | null): Uint8Array {
  return generateInvoicePdfBytes(detail, logoDataUrl);
}

export function creditNotePdfFileName(detail: InvoiceDetail): string {
  return invoicePdfFileName(detail).replace(/^Fattura_/, "NotaCredito_");
}
