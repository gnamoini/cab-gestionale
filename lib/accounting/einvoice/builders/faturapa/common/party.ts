import { el, elOpt, txt, type XmlNode } from "@/lib/accounting/einvoice/serialization/xml-ast";
import type { Party } from "@/lib/accounting/einvoice/canonical/model";

function partyIdNodes(party: Party): XmlNode[] {
  const nodes: XmlNode[] = [];
  if (party.vatIdentity?.vatNumber) {
    nodes.push(
      el("IdFiscaleIVA", [
        el("IdPaese", [txt(party.vatIdentity.countryCode || "IT")]),
        el("IdCodice", [txt(party.vatIdentity.vatNumber!)]),
      ]),
    );
  } else if (party.fiscalCode) {
    nodes.push(el("CodiceFiscale", [txt(party.fiscalCode)]));
  }
  return nodes;
}

function anagraficaNodes(party: Party): XmlNode[] {
  if (party.denomination) return [el("Anagrafica", [el("Denominazione", [txt(party.denomination)])])];
  if (party.firstName && party.lastName) {
    return [
      el("Anagrafica", [el("Nome", [txt(party.firstName)]), el("Cognome", [txt(party.lastName)])]),
    ];
  }
  if (party.denomination) return [el("Anagrafica", [el("Denominazione", [txt(party.denomination)])])];
  return [];
}

function sedeNodes(party: Party): XmlNode | null {
  if (!party.address?.street) return null;
  const children: XmlNode[] = [
    el("Indirizzo", [txt(party.address.street)]),
    el("CAP", [txt(party.address.postalCode)]),
    el("Comune", [txt(party.address.city)]),
  ];
  if (party.address.province) children.push(el("Provincia", [txt(party.address.province)]));
  children.push(el("Nazione", [txt(party.address.country || "IT")]));
  return el("Sede", children);
}

export function buildSupplierParty(supplier: Party): XmlNode[] {
  const dati: XmlNode[] = [...partyIdNodes(supplier), ...anagraficaNodes(supplier)];
  if (supplier.fiscalRegime) dati.push(el("RegimeFiscale", [txt(supplier.fiscalRegime)]));
  const sede = sedeNodes(supplier);
  const children: XmlNode[] = [el("DatiAnagrafici", dati)];
  if (sede) children.push(sede);
  return [el("CedentePrestatore", children)];
}

export function buildCustomerParty(customer: Party): XmlNode[] {
  const dati: XmlNode[] = [...partyIdNodes(customer), ...anagraficaNodes(customer)];
  const sede = sedeNodes(customer);
  const children: XmlNode[] = [el("DatiAnagrafici", dati)];
  if (sede) children.push(sede);
  return [el("CessionarioCommittente", children)];
}

export function buildTaxRepresentativeParty(rep: Party): XmlNode | null {
  const dati: XmlNode[] = [...partyIdNodes(rep), ...anagraficaNodes(rep)];
  if (dati.length === 0) return null;
  const sede = sedeNodes(rep);
  const children: XmlNode[] = [el("DatiAnagrafici", dati)];
  if (sede) children.push(sede);
  return el("RappresentanteFiscale", children);
}
