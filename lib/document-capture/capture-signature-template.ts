import type { CaptureSignatureBbox } from "@/lib/document-capture/capture-signature-crop";
import { mmBoxToNormBbox } from "@/lib/document-capture/capture-template-field-template";
import {
  getIngressoBlankSignatureBoxesMm,
  SCHEDA_BLANK_TEMPLATE_VERSION,
} from "@/lib/pdf/schede-blank-layout";

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
