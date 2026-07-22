import type { RicambioMagazzino } from "@/lib/magazzino/types";

export type CaptureSheetFieldMeta = {
  fieldKey: string;
  source: "ocr" | "user";
  confidence?: number;
  status: "VALID" | "WARNING";
};

export type CaptureSheetRowHint = {
  tone: "ok" | "suggested" | "ambiguous" | "catalog";
  message?: string;
  meta: CaptureSheetFieldMeta;
};

export type SchedaGlobalOpts = {
  addettiLista: string[];
};

export type SchedaRicambiFormOpts = SchedaGlobalOpts & {
  magazzino?: readonly RicambioMagazzino[];
  defaultAddetto?: string;
};
