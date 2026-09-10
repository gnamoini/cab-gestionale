import { el, txt, type XmlNode } from "@/lib/accounting/einvoice/serialization/xml-ast";
import type { FatturapaSemanticDocument } from "@/lib/accounting/einvoice/semantic/faturapa-semantic-model";

export function buildReferenceNodes(semantic: FatturapaSemanticDocument): XmlNode[] {
  const nodes: XmlNode[] = [];
  const refs = semantic.references;
  if (!refs) return nodes;

  for (const link of refs.linkedDocuments ?? []) {
    if (link.type === "ddt" && link.number) {
      nodes.push(
        el("DatiDDT", [
          el("NumeroDDT", [txt(link.number)]),
          ...(link.date ? [el("DataDDT", [txt(link.date)])] : []),
        ]),
      );
    }
    if (link.type === "fattura_collegata" && link.number) {
      nodes.push(
        el("DatiFattureCollegate", [
          el("IdDocumento", [txt(link.number)]),
          ...(link.date ? [el("Data", [txt(link.date)])] : []),
        ]),
      );
    }
  }

  if (refs.purchaseOrder?.idDocumento) {
    nodes.push(
      el("DatiOrdineAcquisto", [
        el("IdDocumento", [txt(refs.purchaseOrder.idDocumento)]),
        ...(refs.purchaseOrder.date ? [el("Data", [txt(refs.purchaseOrder.date)])] : []),
        ...(refs.purchaseOrder.lineNumber != null
          ? [el("NumItem", [txt(String(refs.purchaseOrder.lineNumber))])]
          : []),
        ...(semantic.publicAdministration?.cig ? [el("CodiceCIG", [txt(semantic.publicAdministration.cig!)])] : []),
        ...(semantic.publicAdministration?.cup ? [el("CodiceCUP", [txt(semantic.publicAdministration.cup!)])] : []),
      ]),
    );
  }

  if (refs.contract?.idDocumento) {
    nodes.push(
      el("DatiContratto", [
        el("IdDocumento", [txt(refs.contract.idDocumento)]),
        ...(refs.contract.date ? [el("Data", [txt(refs.contract.date)])] : []),
      ]),
    );
  }

  return nodes;
}
