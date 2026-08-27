import { generateQrSvgString } from "@/lib/inventory-labels/qr/generator";
import { cutBorderRectSvg } from "@/lib/inventory-labels/render/cut-border";
import { loadLabelLogoDataUrl } from "@/lib/inventory-labels/render/label-logo.server";
import { labelFontSlotFor, textLineToSvgPath } from "@/lib/inventory-labels/render/text-paths";
import { lineMetrics } from "@/lib/inventory-labels/render/text-metrics";
import { nestedSvgAt, parseSvgFragment } from "@/lib/inventory-labels/render/svg-embed";
import { MEZZO_LABEL_TEMPLATE, mmToPx } from "@/lib/mezzo-labels/domain/template";
import {
  composeMezzoLabel,
  type MezzoLabelComposition,
} from "@/lib/mezzo-labels/render/compose-label";
import type { MezzoLabelPayload } from "@/lib/mezzo-labels/domain/types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function renderQrFragment(composition: MezzoLabelComposition): Promise<string> {
  const { qr, qrUrl, template } = composition;
  const x = mmToPx(qr.xMm, template.dpi);
  const y = mmToPx(qr.yMm, template.dpi);
  const size = mmToPx(qr.sizeMm, template.dpi);
  const qrSvg = await generateQrSvgString(qrUrl, size);
  const frag = parseSvgFragment(qrSvg);
  return nestedSvgAt(x, y, size, size, frag, "xMidYMid slice");
}

function renderLogoFragment(logoDataUrl: string | null, composition: MezzoLabelComposition): string {
  if (!logoDataUrl) return "";
  const { logo, template } = composition;
  const x = mmToPx(logo.xMm, template.dpi);
  const y = mmToPx(logo.yMm, template.dpi);
  const w = mmToPx(logo.maxWidthMm, template.dpi);
  const h = mmToPx(logo.maxHeightMm, template.dpi);
  return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${escapeXml(logoDataUrl)}" preserveAspectRatio="xMidYMid meet"/>`;
}

function renderTextFragments(composition: MezzoLabelComposition): string {
  const { template } = composition;
  return composition.texts
    .map((t) => {
      const slot = labelFontSlotFor("sans", t.bold, true);
      const x = mmToPx(t.xMm, template.dpi);
      const y = mmToPx(t.yMm, template.dpi);
      const { fontSizePx } = lineMetrics(t.fontPt, template.dpi);
      return textLineToSvgPath(t.text, x, y, fontSizePx, slot, "hanging");
    })
    .join("");
}

export async function renderMezzoLabelSvg(
  payload: MezzoLabelPayload,
  qrUrl: string,
): Promise<string> {
  const composition = composeMezzoLabel(payload, qrUrl, MEZZO_LABEL_TEMPLATE);
  const t = composition.template;
  const w = mmToPx(t.widthMm, t.dpi);
  const h = mmToPx(t.heightMm, t.dpi);
  const logoDataUrl = await loadLabelLogoDataUrl();
  const qrFrag = await renderQrFragment(composition);
  const logoFrag = renderLogoFragment(logoDataUrl, composition);
  const textFrag = renderTextFragments(composition);
  const cutBorder = cutBorderRectSvg(w, h, t.cutBorderMm, t.dpi, "mezzo");

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
  ];
  if (cutBorder) parts.push(cutBorder);
  parts.push(logoFrag, qrFrag, textFrag, "</svg>");

  return parts.join("");
}

export async function renderMezzoLabelSvgBytes(
  payload: MezzoLabelPayload,
  qrUrl: string,
): Promise<Buffer> {
  const svg = await renderMezzoLabelSvg(payload, qrUrl);
  return Buffer.from(svg, "utf8");
}
