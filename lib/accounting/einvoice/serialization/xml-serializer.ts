import { roundMoney } from "@/lib/vat/vat-rounding";
import type { XmlElementNode, XmlNode } from "@/lib/accounting/einvoice/serialization/xml-ast";
import { InvoiceXmlSerializationError } from "@/lib/accounting/einvoice/errors/invoice-xml-serialization-error";

const ELEMENT_ORDER_OVERRIDES: Record<string, string[]> = {
  FatturaElettronica: ["FatturaElettronicaHeader", "FatturaElettronicaBody"],
  FatturaElettronicaHeader: [
    "DatiTrasmissione",
    "CedentePrestatore",
    "RappresentanteFiscale",
    "CessionarioCommittente",
    "TerzoIntermediarioOSoggettoEmittente",
    "SoggettoEmittente",
  ],
  DatiGeneraliDocumento: [
    "TipoDocumento",
    "Divisa",
    "Data",
    "Numero",
    "DatiRitenuta",
    "DatiBollo",
    "DatiCassaPrevidenziale",
    "ScontoMaggiorazione",
    "ImportoTotaleDocumento",
    "Arrotondamento",
    "Causale",
    "Art73",
  ],
  DettaglioLinee: [
    "NumeroLinea",
    "TipoCessionePrestazione",
    "CodiceArticolo",
    "Descrizione",
    "Quantita",
    "UnitaMisura",
    "DataInizioPeriodo",
    "DataFinePeriodo",
    "PrezzoUnitario",
    "ScontoMaggiorazione",
    "PrezzoTotale",
    "AliquotaIVA",
    "Ritenuta",
    "Natura",
    "RiferimentoAmministrazione",
    "AltriDatiGestionali",
  ],
  DatiRiepilogo: [
    "AliquotaIVA",
    "Natura",
    "SpeseAccessorie",
    "Arrotondamento",
    "ImponibileImporto",
    "Imposta",
    "EsigibilitaIVA",
    "RiferimentoNormativo",
  ],
};

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** Deterministic decimal formatting for fiscal amounts (no scientific notation). */
export function formatFiscalDecimal(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return (0).toFixed(decimals);
  const rounded = roundMoney(value);
  return rounded.toFixed(decimals);
}

function sortChildren(name: string, children: XmlNode[]): XmlNode[] {
  const order = ELEMENT_ORDER_OVERRIDES[name];
  if (!order) return children;
  const elements = children.filter((c): c is XmlElementNode => c.kind === "element");
  const texts = children.filter((c) => c.kind === "text");
  const sorted = [...elements].sort((a, b) => {
    const ia = order.indexOf(a.name);
    const ib = order.indexOf(b.name);
    const ra = ia === -1 ? 999 : ia;
    const rb = ib === -1 ? 999 : ib;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
  return [...sorted, ...texts];
}

function serializeNode(node: XmlNode, indent: string, pretty: boolean): string {
  if (node.kind === "text") return xmlEscape(node.value);
  const attrs = node.attributes
    ? Object.keys(node.attributes)
        .sort()
        .map((k) => ` ${k}="${xmlEscape(node.attributes![k])}"`)
        .join("")
    : "";
  const children = sortChildren(node.name, node.children);
  if (children.length === 0) return `<${node.name}${attrs}/>`;
  const inner = children
    .map((c) => {
      if (!pretty) return serializeNode(c, "", false);
      if (c.kind === "text") return xmlEscape(c.value);
      return `${indent}  ${serializeNode(c, `${indent}  `, pretty)}`;
    })
    .join(pretty ? "\n" : "");
  if (!pretty) return `<${node.name}${attrs}>${inner}</${node.name}>`;
  return `<${node.name}${attrs}>\n${inner}\n${indent}</${node.name}>`;
}

export function serializeXmlAst(root: XmlElementNode, opts?: { pretty?: boolean }): string {
  try {
    const pretty = opts?.pretty ?? false;
    const body = serializeNode(root, "", pretty);
    return `<?xml version="1.0" encoding="UTF-8"?>${pretty ? "\n" : ""}${body}`;
  } catch (e) {
    throw new InvoiceXmlSerializationError(
      "XML_SERIALIZATION_FAILED",
      e instanceof Error ? e.message : "Serializzazione XML fallita",
    );
  }
}
