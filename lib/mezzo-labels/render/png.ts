import sharp from "sharp";
import { MEZZO_LABEL_TEMPLATE, mmToPx } from "@/lib/mezzo-labels/domain/template";
import { renderMezzoLabelSvg } from "@/lib/mezzo-labels/render/svg";
import type { MezzoLabelPayload } from "@/lib/mezzo-labels/domain/types";

export async function renderMezzoLabelPng(
  payload: MezzoLabelPayload,
  qrUrl: string,
): Promise<Buffer> {
  const svg = await renderMezzoLabelSvg(payload, qrUrl);
  const widthPx = mmToPx(MEZZO_LABEL_TEMPLATE.widthMm);
  const heightPx = mmToPx(MEZZO_LABEL_TEMPLATE.heightMm);
  return sharp(Buffer.from(svg)).png().resize(widthPx, heightPx, { fit: "fill" }).toBuffer();
}
