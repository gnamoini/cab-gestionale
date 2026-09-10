import type { CanonicalElectronicInvoice } from "@/lib/accounting/einvoice/canonical/model";

/** Version-agnostic FatturaPA semantic tree — adapter maps to XSD-specific AST. */
export type FatturapaSemanticDocument = {
  transmissionFormat: "FPR12" | "FPA12";
  namespace: string;
  transmission: {
    senderCountry: string;
    senderId: string;
    progressiveId: string;
    recipientCode: string;
    recipientPec?: string | null;
  };
  supplier: CanonicalElectronicInvoice["supplier"];
  customer: CanonicalElectronicInvoice["customer"];
  taxRepresentative?: CanonicalElectronicInvoice["taxRepresentative"];
  document: CanonicalElectronicInvoice["document"];
  lines: CanonicalElectronicInvoice["lines"];
  vatSummaries: CanonicalElectronicInvoice["vatSummaries"];
  payment?: CanonicalElectronicInvoice["payment"];
  references?: CanonicalElectronicInvoice["references"];
  stampDuty?: CanonicalElectronicInvoice["stampDuty"];
  publicAdministration?: CanonicalElectronicInvoice["publicAdministration"];
};

export function buildFatturapaSemanticModel(invoice: CanonicalElectronicInvoice, namespace: string): FatturapaSemanticDocument {
  return {
    transmissionFormat: invoice.transmissionFormat,
    namespace,
    transmission: {
      senderCountry: invoice.transmission.sender.countryCode,
      senderId: invoice.transmission.sender.vatNumber ?? invoice.transmission.sender.fiscalCode ?? "",
      progressiveId: invoice.transmission.progressiveTransmissionId,
      recipientCode: invoice.transmission.recipientCode,
      recipientPec: invoice.transmission.recipientPec,
    },
    supplier: invoice.supplier,
    customer: invoice.customer,
    taxRepresentative: invoice.taxRepresentative,
    document: invoice.document,
    lines: invoice.lines,
    vatSummaries: invoice.vatSummaries,
    payment: invoice.payment,
    references: invoice.references,
    stampDuty: invoice.stampDuty,
    publicAdministration: invoice.publicAdministration,
  };
}
