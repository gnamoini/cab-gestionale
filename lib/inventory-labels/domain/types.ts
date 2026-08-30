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

export type LabelSupplier = {
  name: string;
  code: string | null;
};

export type LabelPayload = {
  marca: string;
  marcaSecondaria: string;
  descrizione: string;
  codice: string;
  codiceSecondario: string;
  /** SSOT fornitori alternativi — layout decide resa grafica. */
  fornitoriAlternativi: LabelSupplier[];
  /** @deprecated Usare fornitoriAlternativi — mantenuto per transizione fingerprint. */
  fornitoreAlternativo: string;
  /** @deprecated Usare fornitoriAlternativi — mantenuto per transizione fingerprint. */
  codiceAlternativo: string;
};

export type LabelTextField = keyof Omit<LabelPayload, "fornitoriAlternativi">;

export type LabelTypography = {
  scale: number;
  weight: "normal" | "bold";
  tracking: number;
  lineHeight: number;
};

export type LabelLayoutMode =
  | "horizontal-qr-left"
  | "horizontal-qr-full-height"
  | "vertical-stack"
  | "manual-centered";

export type LabelKind = "internal" | "cliente" | "manual";

export type SupplierLayoutMode = "inline-slash" | "stacked-pairs";

export const DEFAULT_LABEL_TYPOGRAPHY: LabelTypography = {
  scale: 1,
  weight: "normal",
  tracking: 0,
  lineHeight: 1.2,
};

export type LabelTemplateElement =
  | {
      type: "qr";
      xMm: number;
      yMm: number;
      sizeMm: number;
    }
  | {
      type: "logo";
      xMm: number;
      yMm: number;
      widthMm: number;
      heightMm: number;
    }
  | {
      type: "text";
      field?: LabelTextField;
      /** Testo fisso (alternativo a `field` / `literalSource`). */
      literal?: string;
      /** Testo risolto a render — es. host dal QR cliente. */
      literalSource?: "clienteWebsite";
      xMm: number;
      yMm: number;
      fontPt: number;
      maxLines?: number;
      maxWidthMm?: number;
      font?: "sans" | "mono";
      /** Limite inferiore zona testo (mm) — `maxLines` derivato a render. */
      zoneBottomMm?: number;
      vAlign?: "top" | "center";
      hAlign?: "left" | "center";
    };

export type LabelTemplateDefinition = {
  id: string;
  version: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
  marginsMm: number;
  /** Bordo taglio visibile (mm). */
  cutBorderMm?: number;
  typography: LabelTypography;
  layoutMode: LabelLayoutMode;
  supplierLayout: SupplierLayoutMode;
  qr: { maxSizeMm: number; position: "top-left" | "top-center" };
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

export const GENERATOR_VERSION = "1.7.0";

export type LabelRenderOptions = {
  labelKind?: LabelKind;
};
