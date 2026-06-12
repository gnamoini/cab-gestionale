export type DocumentDeliverySource = "archive" | "lavorazione";

export type DocumentDeliveryMode = "preview" | "download";

export type ResolvedDocumentFile = {
  source: DocumentDeliverySource;
  storagePath: string;
  fileName: string;
  contentType: string;
  /** Cache-buster token (e.g. uploaded_at). */
  contentVersion: string;
  contentHash?: string;
  documentRowId?: string;
};
