import sharp from "sharp";
import type { LabelPayload, LabelRenderOptions, LabelTemplateDefinition } from "@/lib/inventory-labels/domain/types";
import { renderLabelSvg } from "@/lib/inventory-labels/render/svg";
import { templateDimensionsPx } from "@/lib/inventory-labels/render/layout";
import { isInventoryLabelPdfPipelineV2 } from "@/lib/inventory-labels/render/pipeline-flag";

const FALLBACK_DPI = 150;

export async function renderLabelPng(
  template: LabelTemplateDefinition,
  payload: LabelPayload,
  qrUrl: string,
  renderOptions?: LabelRenderOptions,
): Promise<Buffer> {
  const v2 = isInventoryLabelPdfPipelineV2();
  const svg = await renderLabelSvg(template, payload, qrUrl, {
    textAsPaths: v2,
    embedFonts: !v2,
    includeBarcode: renderOptions?.includeBarcode,
  });
  const { widthPx, heightPx } = templateDimensionsPx(template);
  return sharp(Buffer.from(svg)).png().resize(widthPx, heightPx, { fit: "fill" }).toBuffer();
}

/** Fallback raster: lower DPI, sequential-friendly — survives OOM on full 300 DPI batch. */
export async function renderLabelPngFallback(
  template: LabelTemplateDefinition,
  payload: LabelPayload,
  qrUrl: string,
  renderOptions?: LabelRenderOptions,
): Promise<Buffer> {
  const svg = await renderLabelSvg(template, payload, qrUrl, {
    textAsPaths: true,
    includeBarcode: renderOptions?.includeBarcode,
  });
  const widthPx = Math.round((template.widthMm / 25.4) * FALLBACK_DPI);
  const heightPx = Math.round((template.heightMm / 25.4) * FALLBACK_DPI);
  return sharp(Buffer.from(svg))
    .png()
    .resize(widthPx, heightPx, { fit: "fill" })
    .toBuffer();
}

export async function renderLabelSvgBytes(
  template: LabelTemplateDefinition,
  payload: LabelPayload,
  qrUrl: string,
  renderOptions?: LabelRenderOptions,
): Promise<Buffer> {
  const svg = await renderLabelSvg(template, payload, qrUrl, {
    textAsPaths: true,
    includeBarcode: renderOptions?.includeBarcode,
  });
  return Buffer.from(svg);
}

export { FALLBACK_DPI };
