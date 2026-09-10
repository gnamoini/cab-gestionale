import type { SchemaSupportedDocumentType } from "@/lib/accounting/einvoice/canonical/document-types";
import type { TransmissionFormat } from "@/lib/accounting/einvoice/canonical/model";

export type GeneratedInvoiceXml = {
  xml: string;
  schemaVersion: string;
  transmissionFormat: TransmissionFormat;
  documentType: SchemaSupportedDocumentType;
  documentNumber: string;
  documentDate: string;
  sha256: string;
  filename: string;
  validated: true;
};
