import type { LabelPayload, LabelTemplateDefinition, LabelTemplateElement } from "@/lib/inventory-labels/domain/types";
import {
  formatLabelCodiceLine,
  formatLabelMarcaLine,
} from "@/lib/inventory-labels/domain/label-display";
import { fieldValue, maxCharsForWrap, maxCharsForWidth, wrapLabelLines } from "@/lib/inventory-labels/render/layout";
import { labelDisplayCaps } from "@/lib/inventory-labels/domain/label-display";
import {
  blockHeightMm,
  capHeightMm,
  lineMetrics,
  maxLinesForZoneMm,
  nextRowBaselineMm,
  stackBottomMmFrom,
  supplierCapBaselineMm,
} from "@/lib/inventory-labels/render/text-metrics";

const DESC_CODICE_EXTRA_GAP_MM = 0.4;
const CODICE_SECONDARIO_EXTRA_GAP_MM = 0.3;

export type PlacedLabelText = {
  field: keyof LabelPayload;
  xMm: number;
  yMm: number;
  fontPt: number;
  font?: "sans" | "mono";
  lines: string[];
  /** `alphabetic` = yMm è la baseline (gruppo fornitore, caps). */
  baseline?: "hanging" | "alphabetic";
};

function textEl(
  els: LabelTemplateElement[],
  field: keyof LabelPayload,
): Extract<LabelTemplateElement, { type: "text" }> {
  const el = els.find((e) => e.type === "text" && e.field === field);
  if (!el || el.type !== "text") throw new Error(`Elemento testo ${field} mancante`);
  return el;
}

function barcodeEl(els: LabelTemplateElement[]) {
  const el = els.find((e) => e.type === "barcode");
  if (!el || el.type !== "barcode") throw new Error("Elemento barcode mancante");
  return el;
}

function wrapBlock(
  text: string,
  fontPt: number,
  textW: number,
  maxLines: number,
  font?: "sans" | "mono",
  breakMode: "words" | "chars" | "codice" = "words",
): { fontPt: number; lines: string[] } {
  const capped = labelDisplayCaps(text);
  const wrapChars = maxCharsForWrap(textW, fontPt, font);
  const fitChars =
    breakMode === "codice" ? maxCharsForWidth(textW, fontPt, font) : wrapChars;
  return {
    fontPt,
    lines: wrapLabelLines(capped, maxLines, wrapChars, breakMode, fitChars),
  };
}

type StackBlock = {
  field: keyof LabelPayload;
  fontPt: number;
  font?: "sans" | "mono";
  lines: string[];
};

function assignPositions(
  textX: number,
  topMm: number,
  blocks: StackBlock[],
  rowStepMm: number,
  dpi: number,
  extraGapAfter?: (field: keyof LabelPayload, next?: keyof LabelPayload) => number,
): PlacedLabelText[] {
  const placed: PlacedLabelText[] = [];
  let y = topMm;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    placed.push({ field: b.field, xMm: textX, yMm: y, fontPt: b.fontPt, font: b.font, lines: b.lines });
    if (i < blocks.length - 1) {
      const next = blocks[i + 1]!;
      const gap = extraGapAfter?.(b.field, next.field) ?? 0;
      y = nextRowBaselineMm(y, b.lines.length, b.fontPt, rowStepMm, dpi) + gap;
    }
  }
  return placed;
}

/** Gruppo fornitore: baseline inferiore sul fondo barcode (caps, no descender). */
function assignBottomBaselines(
  textX: number,
  anchorBottomMm: number,
  blocks: StackBlock[],
  dpi: number,
): PlacedLabelText[] {
  if (!blocks.length) return [];
  const placed: PlacedLabelText[] = [];
  let baselineMm = anchorBottomMm;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i]!;
    placed.unshift({
      field: b.field,
      xMm: textX,
      yMm: baselineMm,
      fontPt: b.fontPt,
      font: b.font,
      lines: b.lines,
      baseline: "alphabetic",
    });
    if (i > 0) {
      const { lineStepMm } = lineMetrics(b.fontPt, dpi);
      const n = Math.max(1, b.lines.length);
      const blockTop = baselineMm - capHeightMm(b.fontPt, dpi) - (n - 1) * lineStepMm;
      baselineMm = blockTop - lineMetrics(blocks[i - 1]!.fontPt, dpi).lineStepMm * 0.12;
    }
  }
  return placed;
}

function supplierInkTopMm(blocks: StackBlock[], anchorBottomMm: number, dpi: number): number {
  if (!blocks.length) return anchorBottomMm;
  let baselineMm = anchorBottomMm;
  let top = anchorBottomMm;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i]!;
    const { lineStepMm } = lineMetrics(b.fontPt, dpi);
    const n = Math.max(1, b.lines.length);
    top = Math.min(top, baselineMm - capHeightMm(b.fontPt, dpi) - (n - 1) * lineStepMm);
    if (i > 0) {
      const blockTop = baselineMm - capHeightMm(b.fontPt, dpi) - (n - 1) * lineStepMm;
      baselineMm = blockTop - lineMetrics(blocks[i - 1]!.fontPt, dpi).lineStepMm * 0.12;
    }
  }
  return top;
}

function buildTopBlocks(payload: LabelPayload): Array<{ field: keyof LabelPayload; text: string; font?: "sans" | "mono" }> {
  const marcaLine = formatLabelMarcaLine(payload.marca, payload.marcaSecondaria);
  const codiceLine = formatLabelCodiceLine(fieldValue(payload, "codice"), payload.marca);
  const codiceSecondarioLine = formatLabelCodiceLine(
    fieldValue(payload, "codiceSecondario"),
    payload.marcaSecondaria,
  );

  const blocks: Array<{ field: keyof LabelPayload; text: string; font?: "sans" | "mono" }> = [];
  if (marcaLine) blocks.push({ field: "marca", text: marcaLine });
  if (fieldValue(payload, "descrizione")) {
    blocks.push({ field: "descrizione", text: labelDisplayCaps(fieldValue(payload, "descrizione")) });
  }
  if (codiceLine) blocks.push({ field: "codice", text: codiceLine, font: "mono" });
  if (codiceSecondarioLine) {
    blocks.push({ field: "codiceSecondario", text: codiceSecondarioLine, font: "mono" });
  }
  return blocks;
}

function topGapAfter(field: keyof LabelPayload, next?: keyof LabelPayload): number {
  if (field === "descrizione" && next === "codice") return DESC_CODICE_EXTRA_GAP_MM;
  if (field === "codice" && next === "codiceSecondario") return CODICE_SECONDARIO_EXTRA_GAP_MM;
  return 0;
}

/**
 * Alto: marche unite → descrizione → codici OE con (marca).
 * Basso: fornitore/codice alt ancorati al bordo inferiore barcode.
 * Font fisso dal template — solo wrap, nessuno shrink.
 */
export function resolveLabelTextLayout(
  template: LabelTemplateDefinition,
  payload: LabelPayload,
): PlacedLabelText[] {
  const marcaEl = textEl(template.elements, "marca");
  const descEl = textEl(template.elements, "descrizione");
  const codiceEl = textEl(template.elements, "codice");
  const altFornEl = textEl(template.elements, "fornitoreAlternativo");
  const altCodEl = textEl(template.elements, "codiceAlternativo");
  const barcode = barcodeEl(template.elements);
  const dpi = template.dpi;

  const textX = marcaEl.xMm;
  const textW = marcaEl.maxWidthMm ?? template.widthMm - textX - 2;
  const top = marcaEl.yMm;
  const barcodeBottom = barcode.yMm + barcode.heightMm;
  const topGroupBottom = marcaEl.zoneBottomMm ?? barcode.yMm;
  const supplierTop = altFornEl.yMm ?? barcode.yMm;

  const altFornitore = fieldValue(payload, "fornitoreAlternativo");
  const altCodice = fieldValue(payload, "codiceAlternativo");

  const primaryPt = Math.max(marcaEl.fontPt, descEl.fontPt, codiceEl.fontPt);
  const rowStepMm = lineMetrics(primaryPt, dpi).lineStepMm;

  const supplierBandH = Math.max(lineMetrics(altFornEl.fontPt, dpi).lineStepMm, barcodeBottom - supplierTop);

  const bottomBlocks: StackBlock[] = [];
  let altFornPt = altFornEl.fontPt;
  let altCodPt = altCodEl.fontPt;
  if (altCodice) {
    const maxLines = Math.max(1, maxLinesForZoneMm(supplierBandH * 0.55, altCodPt, dpi));
    const res = wrapBlock(altCodice, altCodPt, textW, maxLines, "mono", "chars");
    bottomBlocks.push({ field: "codiceAlternativo", fontPt: altCodPt, font: "mono", lines: res.lines });
  }
  if (altFornitore) {
    const codiceAltH = bottomBlocks.length
      ? blockHeightMm(bottomBlocks[0]!.lines.length, bottomBlocks[0]!.fontPt, dpi)
      : 0;
    const fornZoneH = Math.max(lineMetrics(altFornPt, dpi).lineStepMm, supplierBandH - codiceAltH);
    const maxLines = Math.max(1, maxLinesForZoneMm(fornZoneH, altFornPt, dpi));
    const res = wrapBlock(altFornitore, altFornPt, textW, maxLines, "sans", "words");
    bottomBlocks.unshift({ field: "fornitoreAlternativo", fontPt: altFornPt, lines: res.lines });
  }

  const supplierAnchorBottom = altCodice
    ? supplierCapBaselineMm(barcodeBottom, altCodPt, dpi)
    : altFornitore
      ? supplierCapBaselineMm(barcodeBottom, altFornPt, dpi)
      : barcodeBottom;

  const supplierInkTop = bottomBlocks.length
    ? supplierInkTopMm(bottomBlocks, supplierAnchorBottom, dpi)
    : supplierAnchorBottom;

  const topSpec = buildTopBlocks(payload);
  const codiceSpecs = topSpec.filter((s) => s.field === "codice" || s.field === "codiceSecondario");
  const descSpec = topSpec.find((s) => s.field === "descrizione");
  const marcaSpec = topSpec.find((s) => s.field === "marca");

  let marcaBlock: StackBlock | null = null;
  if (marcaSpec) {
    const marcaZoneH = Math.max(lineMetrics(primaryPt, dpi).lineStepMm, topGroupBottom - top);
    const marcaMaxLines = Math.max(1, Math.min(3, maxLinesForZoneMm(marcaZoneH * 0.45, primaryPt, dpi)));
    const res = wrapBlock(marcaSpec.text, primaryPt, textW, marcaMaxLines, undefined, "words");
    marcaBlock = { field: "marca", fontPt: primaryPt, lines: res.lines };
  }

  const marcaLines = marcaBlock?.lines ?? [];
  const descTop = marcaBlock?.lines.some((l) => l.trim())
    ? nextRowBaselineMm(top, marcaLines.length, primaryPt, rowStepMm, dpi)
    : top;

  const descZoneBottom = bottomBlocks.length
    ? Math.min(topGroupBottom, supplierInkTop - (codiceSpecs.length ? DESC_CODICE_EXTRA_GAP_MM : 0))
    : topGroupBottom - (codiceSpecs.length ? DESC_CODICE_EXTRA_GAP_MM : 0);

  let descLines: string[] = [];
  if (descSpec) {
    const descMaxLines =
      descZoneBottom > descTop ? maxLinesForZoneMm(descZoneBottom - descTop, primaryPt, dpi) : 1;
    descLines = wrapBlock(descSpec.text, primaryPt, textW, Math.max(1, descMaxLines), undefined, "words").lines;
  }

  const codiceStart =
    descSpec && descLines.length
      ? nextRowBaselineMm(descTop, descLines.length, primaryPt, rowStepMm, dpi) + DESC_CODICE_EXTRA_GAP_MM
      : descTop;
  const codiceBottom = Math.min(topGroupBottom, bottomBlocks.length ? supplierInkTop - 0.08 : topGroupBottom);

  const resolvedCodici: StackBlock[] = [];
  let codiceCursor = codiceStart;
  for (let i = 0; i < codiceSpecs.length; i++) {
    const spec = codiceSpecs[i]!;
    const remaining = codiceSpecs.length - i;
    const minRest =
      (remaining - 1) * (lineMetrics(primaryPt, dpi).lineStepMm + CODICE_SECONDARIO_EXTRA_GAP_MM);
    const zoneH = Math.max(0, codiceBottom - codiceCursor - minRest);
    const maxLines = Math.max(1, maxLinesForZoneMm(zoneH, primaryPt, dpi));
    const res = wrapBlock(spec.text, primaryPt, textW, maxLines, "mono", "codice");
    resolvedCodici.push({
      field: spec.field,
      fontPt: primaryPt,
      font: "mono",
      lines: res.lines,
    });
    codiceCursor =
      nextRowBaselineMm(codiceCursor, res.lines.length, primaryPt, rowStepMm, dpi) +
      (i < codiceSpecs.length - 1 ? CODICE_SECONDARIO_EXTRA_GAP_MM : 0);
  }

  const topBlocks: StackBlock[] = [];
  if (marcaBlock) topBlocks.push(marcaBlock);
  if (descSpec && descLines.length) {
    topBlocks.push({ field: "descrizione", fontPt: primaryPt, lines: descLines });
  }
  topBlocks.push(...resolvedCodici);

  const topPlaced = assignPositions(textX, top, topBlocks, rowStepMm, dpi, topGapAfter);
  const bottomPlaced =
    bottomBlocks.length > 0 ? assignBottomBaselines(textX, supplierAnchorBottom, bottomBlocks, dpi) : [];

  return [...topPlaced, ...bottomPlaced];
}
