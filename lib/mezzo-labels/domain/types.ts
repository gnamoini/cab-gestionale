export const MEZZO_LABEL_ENTITY_TYPE = "mezzo" as const;

export const MEZZO_TOKEN_STATUSES = ["active", "revoked", "expired"] as const;
export type MezzoTokenStatus = (typeof MEZZO_TOKEN_STATUSES)[number];

export const MEZZO_LABEL_FORMATS = ["png", "svg", "pdf"] as const;
export type MezzoLabelFormat = (typeof MEZZO_LABEL_FORMATS)[number];

export const MEZZO_LABEL_EVENT_TYPES = [
  "MEZZO_QR_CREATED",
  "MEZZO_QR_REGENERATED",
  "MEZZO_LABEL_PRINTED",
  "MEZZO_LABEL_BULK_PRINTED",
] as const;
export type MezzoLabelEventType = (typeof MEZZO_LABEL_EVENT_TYPES)[number];

export type MezzoQrTokenRow = {
  id: string;
  token: string;
  mezzo_id: string;
  status: MezzoTokenStatus;
  created_at: string;
  created_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  superseded_by: string | null;
};

export type MezzoLabelPayload = {
  targa: string;
  numeroScuderia: string | null;
};

export const MEZZO_LABEL_GENERATOR_VERSION = "1.0.0";

/** 1 mm in typographic points (PostScript). */
export const MM_TO_PT = 2.83464567;
