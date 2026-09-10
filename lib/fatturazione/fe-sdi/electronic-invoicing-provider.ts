export type EinvoiceSubmitInput = {
  invoiceId: string;
  xml: string;
  xmlHash: string;
  filename: string;
  idempotencyKey: string;
  correlationKey: string;
};

export type EinvoiceSubmitResult = {
  accepted: boolean;
  providerReference: string | null;
  remoteStatus: string;
  errorCode?: string;
};

export type EinvoiceRemoteStatus = {
  found: boolean;
  providerReference: string | null;
  remoteStatus: string | null;
};

export type EinvoiceNotification = {
  id: string;
  invoiceCorrelation: string;
  outcome: "ACCEPTED" | "DELIVERED" | "DELIVERY_FAILED" | "REJECTED" | "SUBMITTED";
  payload: Record<string, unknown>;
};

export interface ElectronicInvoicingProvider {
  submitInvoice(input: EinvoiceSubmitInput): Promise<EinvoiceSubmitResult>;
  getInvoiceStatus(providerReference: string): Promise<EinvoiceRemoteStatus>;
  getNotifications(since?: string): Promise<EinvoiceNotification[]>;
  downloadInvoice(providerReference: string): Promise<string | null>;
  downloadNotification(notificationId: string): Promise<string | null>;
  findSubmissionByCorrelation(correlationKey: string): Promise<EinvoiceRemoteStatus>;
}
