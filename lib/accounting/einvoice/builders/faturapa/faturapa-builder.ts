import type { XmlElementNode } from "@/lib/accounting/einvoice/serialization/xml-ast";
import { el } from "@/lib/accounting/einvoice/serialization/xml-ast";
import type { FatturapaSemanticDocument } from "@/lib/accounting/einvoice/semantic/faturapa-semantic-model";
import { buildTransmissionData } from "@/lib/accounting/einvoice/builders/faturapa/common/transmission";
import { buildSupplierParty, buildCustomerParty, buildTaxRepresentativeParty } from "@/lib/accounting/einvoice/builders/faturapa/common/party";
import { buildBody } from "@/lib/accounting/einvoice/builders/faturapa/common/body";

export function buildFatturapaXmlAst(semantic: FatturapaSemanticDocument): XmlElementNode {
  const headerChildren = [
    buildTransmissionData(semantic),
    ...buildSupplierParty(semantic.supplier),
    ...buildCustomerParty(semantic.customer),
  ];
  const taxRep = semantic.taxRepresentative ? buildTaxRepresentativeParty(semantic.taxRepresentative) : null;
  if (taxRep) headerChildren.push(taxRep);

  // ponytail: local XSD particles are unqualified — reset default NS on header/body wrappers.
  const header = el("FatturaElettronicaHeader", headerChildren, { xmlns: "" });
  const body = buildBody(semantic);
  if (body.kind === "element") body.attributes = { ...body.attributes, xmlns: "" };

  return el(
    "FatturaElettronica",
    [header, body],
    {
      xmlns: semantic.namespace,
      versione: semantic.transmissionFormat,
    },
  );
}
