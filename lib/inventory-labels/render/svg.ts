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
import { loadLabelLogoDataUrl } from "@/lib/inventory-labels/render/label-logo.server";

let cachedLabelLogoDataUrl: string | null | undefined;

async function resolveLabelLogoDataUrl(): Promise<string | null> {
  if (cachedLabelLogoDataUrl !== undefined) return cachedLabelLogoDataUrl;
  cachedLabelLogoDataUrl = await loadLabelLogoDataUrl();
  return cachedLabelLogoDataUrl;
}

function labelBoldStrokeWidthPx(template: LabelTemplateDefinition, fontSizePx: number): number {
  const ratio = template.id === "a4-pagina-intera" ? 0.3 : 0.11;
  return Math.max(2, Math.round(fontSizePx * ratio * 10) / 10);
}

function labelBoldInkOffsetPx(template: LabelTemplateDefinition, fontSizePx: number): number {
  if (template.id !== "a4-pagina-intera") return 0;
  return Math.max(2.5, Math.round(fontSizePx * 0.018 * 10) / 10);
}

function renderBoldPathSvg(
  pathSvg: string,
  fontSizePx: number,
  template: LabelTemplateDefinition,
): string {
  const d = pathSvg.match(/d="([^"]+)"/)?.[1];
  if (!d) return pathSvg;
  const strokeW = labelBoldStrokeWidthPx(template, fontSizePx);
  const offset = labelBoldInkOffsetPx(template, fontSizePx);
  const inkAttrs = `fill="#000000" stroke="#000000" stroke-width="${strokeW}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"`;
  const layers = [`<path d="${d}" ${inkAttrs}/>`];
  if (offset > 0) {
    layers.unshift(`<path d="${d}" fill="#000000"/>`);
    layers.push(`<path d="${d}" fill="#000000" transform="translate(${offset}, 0)"/>`);
    layers.push(`<path d="${d}" fill="#000000" transform="translate(${-offset}, 0)"/>`);
  }
  return layers.join("");
}

function renderBoldTextSvg(
  line: string,
  x: number,
  dy: number,
  baseline: "hanging" | "alphabetic",
  family: string,
  fontSizePx: number,
  template: LabelTemplateDefinition,
): string {
  const strokeW = labelBoldStrokeWidthPx(template, fontSizePx);
  const offset = labelBoldInkOffsetPx(template, fontSizePx);
  const baseAttrs = `dominant-baseline="${baseline}" font-family="${family}" font-size="${fontSizePx}" fill="#000000"`;
  const inkAttrs = `${baseAttrs} stroke="#000000" stroke-width="${strokeW}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"`;
  const layers = [
    `<text x="${x}" y="${dy}" ${inkAttrs}>${escapeXml(line)}</text>`,
  ];
  if (offset > 0) {
    layers.unshift(`<text x="${x}" y="${dy}" ${baseAttrs}>${escapeXml(line)}</text>`);
    layers.push(`<text x="${x + offset}" y="${dy}" ${baseAttrs}>${escapeXml(line)}</text>`);
    layers.push(`<text x="${x - offset}" y="${dy}" ${baseAttrs}>${escapeXml(line)}</text>`);
  }
  return layers.join("");
}

function isBoldPlaced(
  placed: { bold?: boolean },
  template: LabelTemplateDefinition,
): boolean {
  return Boolean(placed.bold || template.typography?.weight === "bold");
}

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
  const includeBarcode = options?.includeBarcode === true;
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
  const logoDataUrl = template.elements.some((e) => e.type === "logo") ? await resolveLabelLogoDataUrl() : null;

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

    if (el.type === "logo") {
      if (!logoDataUrl) continue;
      const w = mmToPx(el.widthMm, template.dpi);
      const h = mmToPx(el.heightMm, template.dpi);
      parts.push(
        `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${escapeXml(logoDataUrl)}" preserveAspectRatio="xMidYMid meet"/>`,
      );
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
          const path = textLineToSvgPath(line, x, dy, fontSizePx, slot, baseline);
          if (isBoldPlaced(placed, template)) {
            parts.push(renderBoldPathSvg(path, fontSizePx, template));
          } else {
            parts.push(path);
          }
        } else {
          const family = slot === "mono" ? "LabelMono" : "LabelSans";
          if (isBoldPlaced(placed, template)) {
            parts.push(renderBoldTextSvg(line, x, dy, baseline, family, fontSizePx, template));
          } else {
            parts.push(
              `<text x="${x}" y="${dy}" dominant-baseline="${baseline}" font-family="${family}" font-size="${fontSizePx}" fill="#000000">${escapeXml(line)}</text>`,
            );
          }
        }
      });
      continue;
    }

    if (el.type === "barcode") {
      if (!includeBarcode) continue;
      const value = labelDisplayCaps(fieldValue(payload, el.field));
      if (!value) continue;
      const qrEl = template.elements.find((e) => e.type === "qr");
      const barcodeWidthMm =
        el.widthMm ?? (qrEl?.type === "qr" ? qrEl.sizeMm : template.widthMm - el.xMm - 2);
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
