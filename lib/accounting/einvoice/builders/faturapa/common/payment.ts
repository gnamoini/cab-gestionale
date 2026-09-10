import { el, txt, type XmlNode } from "@/lib/accounting/einvoice/serialization/xml-ast";
import { formatFiscalDecimal } from "@/lib/accounting/einvoice/serialization/xml-serializer";
import type { PaymentDetail } from "@/lib/accounting/einvoice/canonical/model";

export function buildPaymentNodes(payments: PaymentDetail[] | null | undefined): XmlNode[] {
  if (!payments?.length) return [];
  const first = payments[0];
  const dettagli = payments.map((p) => {
    const children: XmlNode[] = [];
    if (p.paymentMethod) children.push(el("ModalitaPagamento", [txt(p.paymentMethod)]));
    if (p.dueDate) children.push(el("DataScadenzaPagamento", [txt(p.dueDate)]));
    if (p.amount != null) children.push(el("ImportoPagamento", [txt(formatFiscalDecimal(p.amount))]));
    if (p.iban) children.push(el("IBAN", [txt(p.iban)]));
    if (p.abi) children.push(el("ABI", [txt(p.abi)]));
    if (p.cab) children.push(el("CAB", [txt(p.cab)]));
    if (p.bic) children.push(el("BIC", [txt(p.bic)]));
    return el("DettaglioPagamento", children);
  });
  const condizioni = first.paymentConditions ?? "TP02";
  return [el("DatiPagamento", [el("CondizioniPagamento", [txt(condizioni)]), ...dettagli])];
}
