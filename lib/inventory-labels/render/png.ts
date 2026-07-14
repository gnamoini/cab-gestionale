import "server-only";

import sharp from "sharp";
import type { LabelPayload, LabelTemplateDefinition } from "@/lib/inventory-labels/domain/types";
import { renderLabelSvg } from "@/lib/inventory-labels/render/svg";
import { templateDimensionsPx } from "@/lib/inventory-labels/render/layout";

export async function renderLabelPng(
  template: LabelTemplateDefinition,
  payload: LabelPayload,
  qrUrl: string,
): Promise<Buffer> {
  const svg = await renderLabelSvg(template, payload, qrUrl);
  const { widthPx, heightPx } = templateDimensionsPx(template);
  return sharp(Buffer.from(svg)).png().resize(widthPx, heightPx, { fit: "fill" }).toBuffer();
}
