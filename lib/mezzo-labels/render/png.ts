import sharp from "sharp";
import { renderMezzoLabelSvg } from "@/lib/mezzo-labels/render/svg";
import type { MezzoLabelPayload } from "@/lib/mezzo-labels/domain/types";

export async function renderMezzoLabelPng(
  payload: MezzoLabelPayload,
  qrUrl: string,
): Promise<Buffer> {
  const svg = await renderMezzoLabelSvg(payload, qrUrl);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
