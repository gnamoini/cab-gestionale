import { el, elOpt, txt, type XmlNode } from "@/lib/accounting/einvoice/serialization/xml-ast";
import { formatFiscalDecimal } from "@/lib/accounting/einvoice/serialization/xml-serializer";
import type { FatturapaSemanticDocument } from "@/lib/accounting/einvoice/semantic/faturapa-semantic-model";
import { buildDetailLines } from "@/lib/accounting/einvoice/builders/faturapa/common/lines";
import { buildVatSummaries } from "@/lib/accounting/einvoice/builders/faturapa/common/vat-summary";
import { buildPaymentNodes } from "@/lib/accounting/einvoice/builders/faturapa/common/payment";
import { buildReferenceNodes } from "@/lib/accounting/einvoice/builders/faturapa/common/references";

function buildGeneralDocument(semantic: FatturapaSemanticDocument): XmlNode {
  const d = semantic.document;
  const children: XmlNode[] = [
    el("TipoDocumento", [txt(d.type)]),
    el("Divisa", [txt(d.currency)]),
    el("Data", [txt(d.date)]),
    el("Numero", [txt(d.number)]),
    el("ImportoTotaleDocumento", [txt(formatFiscalDecimal(d.totalDocumentAmount))]),
  ];
  if (semantic.stampDuty?.applicable && semantic.stampDuty.electronicDutyIndicator) {
    const bolloChildren: XmlNode[] = [el("BolloVirtuale", [txt("SI")])];
    if (semantic.stampDuty.amount > 0) {
      bolloChildren.push(el("ImportoBollo", [txt(formatFiscalDecimal(semantic.stampDuty.amount))]));
    }
    children.push(el("DatiBollo", bolloChildren));
  }
  if (d.causale?.length) {
    for (const c of d.causale) children.push(el("Causale", [txt(c)]));
  }
  if (d.art73) children.push(el("Art73", [txt("SI")]));
  return el("DatiGeneraliDocumento", children);
}

export function buildBody(semantic: FatturapaSemanticDocument): XmlNode {
  const generalChildren: XmlNode[] = [buildGeneralDocument(semantic)];
  const refNodes = buildReferenceNodes(semantic);
  if (refNodes.length > 0) generalChildren.push(...refNodes);

  const bodyChildren: XmlNode[] = [
    el("DatiGenerali", generalChildren),
    el("DatiBeniServizi", [...buildDetailLines(semantic.lines), ...buildVatSummaries(semantic.vatSummaries)]),
  ];

  const paymentNodes = buildPaymentNodes(semantic.payment);
  if (paymentNodes.length > 0) bodyChildren.push(...paymentNodes);

  return el("FatturaElettronicaBody", bodyChildren);
}
