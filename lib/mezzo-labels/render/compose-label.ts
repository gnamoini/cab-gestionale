import { MEZZO_LABEL_TEMPLATE, mmToPt, type MezzoLabelTemplate } from "@/lib/mezzo-labels/domain/template";
import type { MezzoLabelPayload } from "@/lib/mezzo-labels/domain/types";

export type MezzoLabelPlacedText = {
  kind: "scuderia" | "targa";
  xMm: number;
  yMm: number;
  text: string;
  fontPt: number;
  bold: boolean;
  maxWidthMm: number;
};

export type MezzoLabelComposition = {
  template: MezzoLabelTemplate;
  payload: MezzoLabelPayload;
  qrUrl: string;
  logo: { xMm: number; yMm: number; maxWidthMm: number; maxHeightMm: number };
  qr: { xMm: number; yMm: number; sizeMm: number };
  texts: MezzoLabelPlacedText[];
};

function fontLineHeightMm(fontPt: number, factor: number): number {
  return (fontPt / 72) * 25.4 * factor;
}

/** Layout engine — single source for SVG/PNG/PDF geometry. */
export function composeMezzoLabel(
  payload: MezzoLabelPayload,
  qrUrl: string,
  template: MezzoLabelTemplate = MEZZO_LABEL_TEMPLATE,
): MezzoLabelComposition {
  const scuderiaRaw = payload.numeroScuderia?.trim() ?? "";
  const hasScuderia = scuderiaRaw.length > 0;
  const targaText = (payload.targa?.trim() || "—").toUpperCase();

  const texts: MezzoLabelPlacedText[] = [];
  const area = template.textArea;
  const logoBottom = template.logo.yMm + template.logo.maxHeightMm;
  let cursorY = logoBottom + 0.8;

  if (hasScuderia) {
    texts.push({
      kind: "scuderia",
      xMm: area.xMm,
      yMm: cursorY,
      text: `N. SCUDERIA: ${scuderiaRaw}`,
      fontPt: template.scuderia.fontPt,
      bold: false,
      maxWidthMm: area.widthMm,
    });
    cursorY += fontLineHeightMm(template.scuderia.fontPt, template.scuderia.lineHeight) + 0.4;
  } else {
    cursorY = Math.max(cursorY, template.qr.yMm + 6);
  }

  const targaY = hasScuderia
    ? cursorY
    : Math.max(cursorY, template.heightMm - template.safeMarginMm - fontLineHeightMm(template.targa.fontPt, template.targa.lineHeight));

  texts.push({
    kind: "targa",
    xMm: area.xMm,
    yMm: targaY,
    text: `TARGA: ${targaText}`,
    fontPt: template.targa.fontPt,
    bold: true,
    maxWidthMm: area.widthMm,
  });

  return {
    template,
    payload,
    qrUrl,
    logo: { ...template.logo },
    qr: { ...template.qr },
    texts,
  };
}

export function compositionDimensionsPt(composition: MezzoLabelComposition): {
  widthPt: number;
  heightPt: number;
  qrPt: { x: number; y: number; size: number };
} {
  const t = composition.template;
  return {
    widthPt: mmToPt(t.widthMm),
    heightPt: mmToPt(t.heightMm),
    qrPt: {
      x: mmToPt(composition.qr.xMm),
      y: mmToPt(composition.qr.yMm),
      size: mmToPt(composition.qr.sizeMm),
    },
  };
}
