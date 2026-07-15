import type { CaptureSignatureBbox } from "@/lib/document-capture/capture-signature-crop";
import {
  getIngressoBlankSignatureBoxesMm,
  ingressoBlankPageSizeMm,
  SCHEDA_BLANK_TEMPLATE_VERSION,
} from "@/lib/pdf/schede-blank-layout";

function mmBoxToNormBbox(
  box: { left: number; top: number; width: number; height: number },
  padMm = 1.5,
): CaptureSignatureBbox {
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

/** ponytail: bbox fisse blank ingresso v2 — se cambia layout aggiornare SCHEDA_BLANK_TEMPLATE_VERSION */
export function ingressoBlankSignatureRegionsNormalized(): {
  richiedente: CaptureSignatureBbox;
  addetto: CaptureSignatureBbox;
} {
  void SCHEDA_BLANK_TEMPLATE_VERSION;
  const boxes = getIngressoBlankSignatureBoxesMm();
  return {
    richiedente: mmBoxToNormBbox(boxes.richiedente),
    addetto: mmBoxToNormBbox(boxes.addetto),
  };
}
