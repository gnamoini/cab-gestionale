import type { LabelPayload, LabelRenderOptions, LabelTemplateDefinition } from "@/lib/inventory-labels/domain/types";
import { mmToPx } from "@/lib/inventory-labels/domain/templates";
import { generateCode128SvgString } from "@/lib/inventory-labels/render/barcode-core";
import { cutBorderRectSvg } from "@/lib/inventory-labels/render/cut-border";
import { nestedSvgAt, parseSvgFragment, cropSvgFragmentToInkBounds } from "@/lib/inventory-labels/render/svg-embed";
import { generateQrSvgString } from "@/lib/inventory-labels/qr/generator";
import { labelDisplayCaps } from "@/lib/inventory-labels/domain/label-display";
import { fieldValue } from "@/lib/inventory-labels/render/layout";
import { resolveLabelTextLayout } from "@/lib/inventory-labels/render/text-layout";
import { labelFontFaceCss } from "@/lib/inventory-labels/render/label-fonts";
import { textLineToSvgPath } from "@/lib/inventory-labels/render/text-paths";
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
  options?: LabelRenderOptions & { embedFonts?: boolean; textAsPaths?: boolean },
): Promise<string> {
  const w = mmToPx(template.widthMm, template.dpi);
  const h = mmToPx(template.heightMm, template.dpi);
  const textAsPaths = options?.textAsPaths ?? false;
  const embedFonts = !textAsPaths && (options?.embedFonts ?? true);
  const includeBarcode = options?.includeBarcode ?? true;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
  ];
  if (embedFonts) {
    parts.push(`<defs><style>${labelFontFaceCss()}</style></defs>`);
  }

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
      const slot = placed.font === "mono" ? "mono" : "sans";
      const baseline = placed.baseline ?? "hanging";
      placed.lines.forEach((line, i) => {
        if (!line.trim()) return;
        const dy =
          baseline === "alphabetic"
            ? y - (placed.lines.length - 1 - i) * lineStepPx
            : y + i * lineStepPx;
        if (textAsPaths) {
          parts.push(textLineToSvgPath(line, x, dy, fontSizePx, slot, baseline));
        } else {
          const family = slot === "mono" ? "LabelMono" : "LabelSans";
          parts.push(
            `<text x="${x}" y="${dy}" dominant-baseline="${baseline}" font-family="${family}" font-size="${fontSizePx}" fill="#000000">${escapeXml(line)}</text>`,
          );
        }
      });
      continue;
    }

    if (el.type === "barcode") {
      if (!includeBarcode) continue;
      const value = labelDisplayCaps(fieldValue(payload, el.field));
      if (!value) continue;
      const qrEl = template.elements.find((e) => e.type === "qr");
      const barcodeWidthMm = qrEl?.type === "qr" ? qrEl.sizeMm : (el.widthMm ?? template.widthMm - el.xMm - 2);
      const bw = mmToPx(barcodeWidthMm, template.dpi);
      const bh = mmToPx(el.heightMm, template.dpi);
      const barcodeSvg = generateCode128SvgString(value, barcodeWidthMm, el.heightMm);
      const frag = cropSvgFragmentToInkBounds(parseSvgFragment(barcodeSvg));
      parts.push(nestedSvgAt(x, y, bw, bh, frag, "none"));
    }
  }

  parts.push("</svg>");
  return parts.join("");
}
