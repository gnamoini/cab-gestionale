import "server-only";

import type { LabelPayload, LabelTemplateDefinition } from "@/lib/inventory-labels/domain/types";
import { mmToPx } from "@/lib/inventory-labels/domain/templates";
import { generateCode128SvgString } from "@/lib/inventory-labels/render/barcode";
import { cutBorderRectSvg } from "@/lib/inventory-labels/render/cut-border";
import { nestedSvgAt, parseSvgFragment } from "@/lib/inventory-labels/render/svg-embed";
import { generateQrSvgString } from "@/lib/inventory-labels/qr/generator";
import { fieldValue } from "@/lib/inventory-labels/render/layout";
import { resolveLabelTextLayout } from "@/lib/inventory-labels/render/text-layout";
import { lineMetrics } from "@/lib/inventory-labels/render/text-metrics";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function renderLabelSvg(
  template: LabelTemplateDefinition,
  payload: LabelPayload,
  qrUrl: string,
): Promise<string> {
  const w = mmToPx(template.widthMm, template.dpi);
  const h = mmToPx(template.heightMm, template.dpi);
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
  ];

  const cutBorder = cutBorderRectSvg(w, h, template.cutBorderMm, template.dpi);
  if (cutBorder) parts.push(cutBorder);

  const placedTexts = resolveLabelTextLayout(template, payload);

  for (const el of template.elements) {
    const x = mmToPx(el.xMm, template.dpi);
    const y = mmToPx(el.yMm, template.dpi);

    if (el.type === "qr") {
      const size = mmToPx(el.sizeMm, template.dpi);
      const qrInner = await generateQrSvgString(qrUrl, size);
      const frag = parseSvgFragment(qrInner);
      parts.push(nestedSvgAt(x, y, size, size, frag, "xMidYMid slice"));
      continue;
    }

    if (el.type === "text") {
      const placed = placedTexts.find((p) => p.field === el.field);
      if (!placed || !placed.lines.length) continue;

      const fontPt = placed.fontPt;
      const x = mmToPx(placed.xMm, template.dpi);
      const y = mmToPx(placed.yMm, template.dpi);
      const { fontSizePx, lineStepPx } = lineMetrics(fontPt, template.dpi);
      const family = placed.font === "mono" ? "monospace" : "sans-serif";
      placed.lines.forEach((line, i) => {
        const dy = y + i * lineStepPx;
        parts.push(
          `<text x="${x}" y="${dy}" dominant-baseline="hanging" font-family="${family}" font-size="${fontSizePx}" fill="#000000">${escapeXml(line)}</text>`,
        );
      });
      continue;
    }

    if (el.type === "barcode") {
      const value = fieldValue(payload, el.field);
      if (!value) continue;
      const barcodeWidthMm = el.widthMm ?? template.widthMm - el.xMm - 2;
      const bw = mmToPx(barcodeWidthMm, template.dpi);
      const bh = mmToPx(el.heightMm, template.dpi);
      const barcodeSvg = generateCode128SvgString(value, barcodeWidthMm, el.heightMm);
      const frag = parseSvgFragment(barcodeSvg);
      parts.push(nestedSvgAt(x, y, bw, bh, frag, "xMidYMid slice"));
    }
  }

  parts.push("</svg>");
  return parts.join("");
}
