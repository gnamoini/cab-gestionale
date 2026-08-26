import { generateQrSvgString } from "@/lib/inventory-labels/qr/generator";
import { loadLabelLogoDataUrl } from "@/lib/inventory-labels/render/label-logo.server";
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

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

async function renderQrFragment(composition: MezzoLabelComposition): Promise<string> {
  const { qr, qrUrl, template } = composition;
  const sizePx = mmToPx(qr.sizeMm, template.dpi);
  const qrSvg = await generateQrSvgString(qrUrl, sizePx);
  const inner = qrSvg.replace(/^<\?xml[^?]*\?>\s*/i, "").replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const viewW = sizePx;
  const viewH = sizePx;
  return `<svg x="${qr.xMm}mm" y="${qr.yMm}mm" width="${qr.sizeMm}mm" height="${qr.sizeMm}mm" viewBox="0 0 ${viewW} ${viewH}" preserveAspectRatio="none">${inner}</svg>`;
}

function renderLogoFragment(logoDataUrl: string | null, composition: MezzoLabelComposition): string {
  if (!logoDataUrl) return "";
  const { logo } = composition;
  return `<image href="${logoDataUrl}" x="${logo.xMm}mm" y="${logo.yMm}mm" width="${logo.maxWidthMm}mm" height="${logo.maxHeightMm}mm" preserveAspectRatio="xMidYMid meet"/>`;
}

function renderTextFragments(composition: MezzoLabelComposition): string {
  return composition.texts
    .map((t) => {
      const weight = t.bold ? "bold" : "normal";
      const maxChars = t.kind === "targa" ? 18 : 22;
      const line = truncateText(t.text, maxChars);
      return `<text x="${t.xMm}mm" y="${t.yMm}mm" font-family="Arial, Helvetica, sans-serif" font-size="${t.fontPt}pt" font-weight="${weight}" fill="#000000" dominant-baseline="hanging">${escapeXml(line)}</text>`;
    })
    .join("");
}

export async function renderMezzoLabelSvg(
  payload: MezzoLabelPayload,
  qrUrl: string,
): Promise<string> {
  const composition = composeMezzoLabel(payload, qrUrl, MEZZO_LABEL_TEMPLATE);
  const t = composition.template;
  const logoDataUrl = await loadLabelLogoDataUrl();
  const qrFrag = await renderQrFragment(composition);
  const logoFrag = renderLogoFragment(logoDataUrl, composition);
  const textFrag = renderTextFragments(composition);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${t.widthMm}mm" height="${t.heightMm}mm" viewBox="0 0 ${t.widthMm} ${t.heightMm}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${logoFrag}
  ${qrFrag}
  ${textFrag}
</svg>`;
}

export async function renderMezzoLabelSvgBytes(
  payload: MezzoLabelPayload,
  qrUrl: string,
): Promise<Buffer> {
  const svg = await renderMezzoLabelSvg(payload, qrUrl);
  return Buffer.from(svg, "utf8");
}
