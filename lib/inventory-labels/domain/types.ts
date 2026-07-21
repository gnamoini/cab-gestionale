export const INVENTORY_ENTITY_MAGAZZINO_RICAMBIO = "magazzino_ricambio" as const;

export type InventoryEntityType = typeof INVENTORY_ENTITY_MAGAZZINO_RICAMBIO;

export const TOKEN_STATUSES = ["active", "revoked", "expired"] as const;
export type TokenStatus = (typeof TOKEN_STATUSES)[number];

export const LABEL_FORMATS = ["png", "svg", "pdf"] as const;
export type LabelFormat = (typeof LABEL_FORMATS)[number];

export const LABEL_EVENT_TYPES = [
  "QR_CREATED",
  "QR_REGENERATED",
  "LABEL_GENERATED",
  "LABEL_PRINTED",
  "DOWNLOAD_PNG",
  "DOWNLOAD_PDF",
  "DOWNLOAD_SVG",
  "LABEL_PDF_BULK_STARTED",
  "LABEL_PDF_BULK_COMPLETED",
  "LABEL_PDF_BULK_FAILED",
] as const;
export type LabelEventType = (typeof LABEL_EVENT_TYPES)[number];

export const OPEN_RICAMBIO_SOURCES = ["qr", "manual", "dashboard", "report"] as const;
export type OpenRicambioSource = (typeof OPEN_RICAMBIO_SOURCES)[number];

export type LabelPayload = {
  marca: string;
  marcaSecondaria: string;
  descrizione: string;
  codice: string;
  codiceSecondario: string;
  fornitoreAlternativo: string;
  codiceAlternativo: string;
};

export type LabelTemplateElement =
  | {
      type: "qr";
      xMm: number;
      yMm: number;
      sizeMm: number;
    }
  | {
      type: "text";
      field: keyof LabelPayload;
      xMm: number;
      yMm: number;
      fontPt: number;
      maxLines?: number;
      maxWidthMm?: number;
      font?: "sans" | "mono";
      /** Limite inferiore zona testo (mm) — `maxLines` derivato a render. */
      zoneBottomMm?: number;
      vAlign?: "top" | "center";
    }
  | {
      type: "barcode";
      field: keyof LabelPayload;
      format: "code128";
      xMm: number;
      yMm: number;
      heightMm: number;
      widthMm?: number;
    };

export type LabelTemplateDefinition = {
  id: string;
  version: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
  /** Bordo taglio visibile (mm). */
  cutBorderMm?: number;
  elements: LabelTemplateElement[];
};

export type InventoryQrTokenRow = {
  id: string;
  token: string;
  entity_type: string;
  entity_id: string;
  status: TokenStatus;
  created_at: string;
  created_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  superseded_by: string | null;
};

export const GENERATOR_VERSION = "1.3.35";

export type LabelRenderOptions = {
  /** Default true — se false il layout resta invariato, area barcode bianca. */
  includeBarcode?: boolean;
};
