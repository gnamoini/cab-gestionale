import { el, elOpt, txt, type XmlNode } from "@/lib/accounting/einvoice/serialization/xml-ast";
import { formatFiscalDecimal } from "@/lib/accounting/einvoice/serialization/xml-serializer";
import type { InvoiceLine } from "@/lib/accounting/einvoice/canonical/model";

export function buildDetailLines(lines: InvoiceLine[]): XmlNode[] {
  return lines.map((line) => {
    const children: XmlNode[] = [
      el("NumeroLinea", [txt(String(line.lineNumber))]),
      el("Descrizione", [txt(line.description)]),
      el("Quantita", [txt(formatFiscalDecimal(line.quantity))]),
      el("PrezzoUnitario", [txt(formatFiscalDecimal(line.unitPrice))]),
      el("PrezzoTotale", [txt(formatFiscalDecimal(line.netAmount))]),
    ];
    if (line.unitOfMeasure) children.push(el("UnitaMisura", [txt(line.unitOfMeasure)]));
    if (line.vatNature) {
      children.push(el("AliquotaIVA", [txt(formatFiscalDecimal(line.vatRate ?? 0))]));
      children.push(el("Natura", [txt(line.vatNature)]));
    } else if (line.vatRate != null) {
      children.push(el("AliquotaIVA", [txt(formatFiscalDecimal(line.vatRate))]));
    }
    if (line.administrationReference) {
      children.push(el("RiferimentoAmministrazione", [txt(line.administrationReference)]));
    }
    return el("DettaglioLinee", children);
  });
}
