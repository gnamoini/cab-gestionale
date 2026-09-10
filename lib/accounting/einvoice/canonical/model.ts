import type { SchemaSupportedDocumentType } from "@/lib/accounting/einvoice/canonical/document-types";

export type TransmissionFormat = "FPR12" | "FPA12";

export type FiscalIdentity = {
  countryCode: string;
  vatNumber?: string | null;
  fiscalCode?: string | null;
};

export type PartyAddress = {
  street: string;
  postalCode: string;
  city: string;
  province?: string | null;
  country: string;
};

export type Party = {
  vatIdentity?: FiscalIdentity | null;
  fiscalCode?: string | null;
  denomination?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  address?: PartyAddress | null;
  recipientCode?: string | null;
  pec?: string | null;
  fiscalRegime?: string | null;
  isPublicAdministration?: boolean;
};

export type InvoiceLine = {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  netAmount: number;
  vatAmount: number;
  vatRate: number | null;
  vatNature: string | null;
  vatCodeId: string | null;
  unitOfMeasure?: string | null;
  administrationReference?: string | null;
};

export type VatSummary = {
  vatRate: number | null;
  vatNature: string | null;
  taxableAmount: number;
  taxAmount: number;
  vatCollectability: "I" | "D" | "S" | null;
  regulatoryReference?: string | null;
};

export type InvoiceTotals = {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
};

export type PaymentDetail = {
  paymentConditions?: string | null;
  paymentMethod?: string | null;
  dueDate?: string | null;
  amount?: number | null;
  iban?: string | null;
  abi?: string | null;
  cab?: string | null;
  bic?: string | null;
};

export type LinkedDocumentReference = {
  type: "ddt" | "ordine" | "preventivo" | "consuntivo" | "lavorazione" | "fattura_collegata";
  id: string;
  label: string;
  date?: string | null;
  number?: string | null;
  lineNumber?: number | null;
};

export type InvoiceReferences = {
  linkedDocuments: LinkedDocumentReference[];
  purchaseOrder?: { idDocumento?: string; date?: string; lineNumber?: number } | null;
  contract?: { idDocumento?: string; date?: string } | null;
  convention?: { idDocumento?: string; date?: string } | null;
  receipt?: { idDocumento?: string; date?: string } | null;
};

/** Imposta di bollo elettronica — non confondere con bollo virtuale ex art. 15 DPR 642/1972. */
export type StampDutyData = {
  applicable: boolean;
  amount: number;
  electronicDutyIndicator: boolean;
};

export type PublicAdministrationData = {
  cig?: string | null;
  cup?: string | null;
  administrationReference?: string | null;
};

export type WithholdingTax = {
  type: string;
  rate: number;
  amount: number;
  paymentReason?: string | null;
};

export type CanonicalElectronicInvoice = {
  schemaVersion: string;
  transmissionFormat: TransmissionFormat;

  transmission: {
    sender: FiscalIdentity;
    recipientCode: string;
    recipientPec?: string | null;
    progressiveTransmissionId: string;
  };

  supplier: Party;
  customer: Party;
  taxRepresentative?: Party | null;

  document: {
    type: SchemaSupportedDocumentType;
    number: string;
    date: string;
    currency: string;
    performanceDate?: string | null;
    totalDocumentAmount: number;
    causale?: string[];
    art73?: boolean;
  };

  lines: InvoiceLine[];
  vatSummaries: VatSummary[];
  totals: InvoiceTotals;

  payment?: PaymentDetail[] | null;
  references?: InvoiceReferences | null;
  withholdingTaxes?: WithholdingTax[] | null;
  stampDuty?: StampDutyData | null;
  publicAdministration?: PublicAdministrationData | null;

  metadata: {
    invoiceId: string;
    companyId: string;
    cabDocumentKind: string;
  };
};
