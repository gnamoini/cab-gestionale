import { el, elOpt, txt, type XmlNode } from "@/lib/accounting/einvoice/serialization/xml-ast";
import { formatFiscalDecimal } from "@/lib/accounting/einvoice/serialization/xml-serializer";
import type { VatSummary } from "@/lib/accounting/einvoice/canonical/model";

export function buildVatSummaries(summaries: VatSummary[]): XmlNode[] {
  return summaries.map((s) => {
    const children: XmlNode[] = [];
    if (s.vatNature) {
      children.push(el("AliquotaIVA", [txt(formatFiscalDecimal(s.vatRate ?? 0))]));
      children.push(el("Natura", [txt(s.vatNature)]));
    } else if (s.vatRate != null) {
      children.push(el("AliquotaIVA", [txt(formatFiscalDecimal(s.vatRate))]));
    }
    children.push(el("ImponibileImporto", [txt(formatFiscalDecimal(s.taxableAmount))]));
    children.push(el("Imposta", [txt(formatFiscalDecimal(s.taxAmount))]));
    if (s.vatCollectability) children.push(el("EsigibilitaIVA", [txt(s.vatCollectability)]));
    if (s.regulatoryReference) children.push(el("RiferimentoNormativo", [txt(s.regulatoryReference)]));
    return el("DatiRiepilogo", children);
  });
}
