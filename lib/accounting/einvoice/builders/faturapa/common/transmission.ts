import { el, elOpt, txt, type XmlNode } from "@/lib/accounting/einvoice/serialization/xml-ast";
import type { FatturapaSemanticDocument } from "@/lib/accounting/einvoice/semantic/faturapa-semantic-model";

export function buildTransmissionData(semantic: FatturapaSemanticDocument): XmlNode {
  const t = semantic.transmission;
  const children: XmlNode[] = [
    el("IdTrasmittente", [el("IdPaese", [txt(t.senderCountry)]), el("IdCodice", [txt(t.senderId)])]),
    el("ProgressivoInvio", [txt(t.progressiveId)]),
    el("FormatoTrasmissione", [txt(semantic.transmissionFormat)]),
    el("CodiceDestinatario", [txt(t.recipientCode)]),
  ];
  if (t.recipientCode === "0000000" && t.recipientPec) {
    children.push(el("PECDestinatario", [txt(t.recipientPec)]));
  }
  return el("DatiTrasmissione", children);
}
