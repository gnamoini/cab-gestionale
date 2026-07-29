import type { CaptureNormalizedBbox } from "@/lib/document-capture/capture-normalized-bbox";
import type { SchedaBlankTipo } from "@/lib/pdf/schede-blank-layout";
import {
  getIngressoBlankValueBoxesMm,
  getLavorazioniBlankValueBoxesMm,
  getRicambiBlankValueBoxesMm,
  getSchedaBlankTitleBoxMm,
  ingressoBlankPageSizeMm,
  LAVORAZIONI_BLANK_PAGES,
  SCHEDA_BLANK_TEMPLATE_VERSION,
  type SchedaBlankMmBox,
} from "@/lib/pdf/schede-blank-layout";

export type CaptureTemplateFieldRegion = {
  fieldKey: string;
  bbox: CaptureNormalizedBbox;
  multiline?: boolean;
};

export function mmBoxToNormBbox(box: SchedaBlankMmBox, padMm = 1.5): CaptureNormalizedBbox {
  const { width: pageW, height: pageH } = ingressoBlankPageSizeMm;
  const left = Math.max(0, box.left - padMm);
  const top = Math.max(0, box.top - padMm);
  const right = Math.min(pageW, box.left + box.width + padMm);
  const bottom = Math.min(pageH, box.top + box.height + padMm);
  return {
    xmin: Math.round((left / pageW) * 1000),
    ymin: Math.round((top / pageH) * 1000),
    xmax: Math.round((right / pageW) * 1000),
    ymax: Math.round((bottom / pageH) * 1000),
  };
}

function boxesToRegions(
  boxes: Record<string, SchedaBlankMmBox>,
  multilineKeys: ReadonlySet<string> = new Set(),
): CaptureTemplateFieldRegion[] {
  return Object.entries(boxes).map(([fieldKey, box]) => ({
    fieldKey,
    bbox: mmBoxToNormBbox(box),
    multiline: multilineKeys.has(fieldKey),
  }));
}

const INGRESSO_MULTILINE = new Set(["descrizione_anomalia", "note"]);

/** ponytail: bbox fisse blank ingresso v2 — se cambia layout aggiornare SCHEDA_BLANK_TEMPLATE_VERSION */
export function ingressoBlankFieldRegionsNormalized(): CaptureTemplateFieldRegion[] {
  void SCHEDA_BLANK_TEMPLATE_VERSION;
  return boxesToRegions(getIngressoBlankValueBoxesMm(), INGRESSO_MULTILINE);
}

export function lavorazioniBlankFieldRegionsNormalized(pageIndex: number): CaptureTemplateFieldRegion[] {
  void SCHEDA_BLANK_TEMPLATE_VERSION;
  return boxesToRegions(getLavorazioniBlankValueBoxesMm(pageIndex));
}

export function ricambiBlankFieldRegionsNormalized(): CaptureTemplateFieldRegion[] {
  void SCHEDA_BLANK_TEMPLATE_VERSION;
  return boxesToRegions(getRicambiBlankValueBoxesMm());
}

export function schedaBlankTitleRegionNormalized(): CaptureTemplateFieldRegion {
  void SCHEDA_BLANK_TEMPLATE_VERSION;
  return {
    fieldKey: "_title",
    bbox: mmBoxToNormBbox(getSchedaBlankTitleBoxMm(), 0.5),
  };
}

export function blankFieldRegionsForTipo(
  tipo: SchedaBlankTipo,
  pageIndex = 0,
): CaptureTemplateFieldRegion[] {
  if (tipo === "ingresso") return ingressoBlankFieldRegionsNormalized();
  if (tipo === "lavorazioni") return lavorazioniBlankFieldRegionsNormalized(pageIndex);
  return ricambiBlankFieldRegionsNormalized();
}

export function lavorazioniBlankPageCount(): number {
  return LAVORAZIONI_BLANK_PAGES;
}
