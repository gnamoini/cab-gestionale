import type { LabelPayload, LabelTemplateDefinition, LabelTemplateElement } from "@/lib/inventory-labels/domain/types";
import {
  fieldValue,
  linesFitWrapWidth,
  maxCharsForWrap,
  maxSingleLineFontPt,
  wrapLines,
} from "@/lib/inventory-labels/render/layout";
import {
  lineMetrics,
  maxLinesForZoneMm,
  nextRowBaselineMm,
} from "@/lib/inventory-labels/render/text-metrics";

const MIN_FONT_PT = 5.5;
const ABS_MIN_DESC_PT = 5;
const MIN_CODICE_FONT_PT = 5.5;
const MIN_ALT_FONT_PT = 5.5;
const MAX_CODICE_FONT_PT = 14;
const WRAP_LINE_CAP = 64;
/** Extra oltre all'interlinea descrizione tra descrizione e codice. */
const DESC_CODICE_EXTRA_GAP_MM = 0.6;
/** Extra oltre all'interlinea descrizione tra codice e fornitore alternativo. */
const CODICE_ALT_EXTRA_GAP_MM = 0.3;

export type PlacedLabelText = {
  field: keyof LabelPayload;
  xMm: number;
  yMm: number;
  fontPt: number;
  font?: "sans" | "mono";
  lines: string[];
};

function textEl(
  els: LabelTemplateElement[],
  field: keyof LabelPayload,
): Extract<LabelTemplateElement, { type: "text" }> {
  const el = els.find((e) => e.type === "text" && e.field === field);
  if (!el || el.type !== "text") throw new Error(`Elemento testo ${field} mancante`);
  return el;
}

function shrinkToFitLines(
  lines: string[],
  text: string,
  maxLines: number,
  startPt: number,
  textW: number,
  floorPt: number,
): { fontPt: number; lines: string[] } {
  let pt = startPt;
  let wrapped = lines;
  while (pt > floorPt && !linesFitWrapWidth(wrapped, textW, pt)) {
    pt = Math.max(floorPt, Math.round((pt - 0.5) * 2) / 2);
    wrapped = wrapLines(text, maxLines, maxCharsForWrap(textW, pt));
  }
  return { fontPt: pt, lines: wrapped };
}

function shrinkDescFonts(marcaPt: number, descPt: number) {
  return {
    marcaPt: Math.max(MIN_FONT_PT, marcaPt * 0.93),
    descPt: Math.max(MIN_FONT_PT, descPt * 0.93),
  };
}

type StackBlock = {
  field: keyof LabelPayload;
  fontPt: number;
  font?: "sans" | "mono";
  lines: string[];
};

function extraGapAfterBlock(field: keyof LabelPayload, nextField?: keyof LabelPayload): number {
  if (field === "descrizione" && nextField === "codice") return DESC_CODICE_EXTRA_GAP_MM;
  if (field === "codice" && nextField === "fornitoreAlternativo") return CODICE_ALT_EXTRA_GAP_MM;
  return 0;
}

function advanceToNextRow(
  yMm: number,
  block: StackBlock,
  nextBlock: StackBlock | undefined,
  rowStepMm: number,
  dpi: number,
): number {
  return (
    nextRowBaselineMm(yMm, block.lines.length, block.fontPt, rowStepMm, dpi) +
    extraGapAfterBlock(block.field, nextBlock?.field)
  );
}

function stackBottomFromBlocks(
  startMm: number,
  blocks: StackBlock[],
  rowStepMm: number,
  dpi: number,
): number {
  let y = startMm;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (i < blocks.length - 1) {
      y = advanceToNextRow(y, b, blocks[i + 1], rowStepMm, dpi);
    } else {
      const n = Math.max(1, b.lines.length);
      const { lineStepMm, fontHeightMm } = lineMetrics(b.fontPt, dpi);
      y = y + (n - 1) * lineStepMm + fontHeightMm;
    }
  }
  return y;
}

function assignPositions(
  textX: number,
  topMm: number,
  blocks: StackBlock[],
  descPt: number,
  dpi: number,
): PlacedLabelText[] {
  const rowStepMm = lineMetrics(descPt, dpi).lineStepMm;
  const placed: PlacedLabelText[] = [];
  let y = topMm;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    placed.push({ field: b.field, xMm: textX, yMm: y, fontPt: b.fontPt, font: b.font, lines: b.lines });
    if (i < blocks.length - 1) {
      y = advanceToNextRow(y, b, blocks[i + 1], rowStepMm, dpi);
    }
  }
  return placed;
}

/**
 * Impila marca → descrizione → codice → alt (fornitore/codice) dall'alto.
 * Passo verticale uniforme = interlinea descrizione.
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
  const dpi = template.dpi;

  const textX = marcaEl.xMm;
  const textW = marcaEl.maxWidthMm ?? template.widthMm - textX - 2;
  const top = marcaEl.yMm;
  const bottom = codiceEl.zoneBottomMm ?? template.heightMm;
  const marcaMaxLines = marcaEl.maxLines ?? 2;

  const codiceValue = fieldValue(payload, "codice");
  const altFornitore = fieldValue(payload, "fornitoreAlternativo");
  const altCodice = fieldValue(payload, "codiceAlternativo");

  let marcaPt = marcaEl.fontPt;
  let descPt = descEl.fontPt;

  let lastAttempt: PlacedLabelText[] | null = null;

  for (let attempt = 0; attempt < 16; attempt++) {
    const descRowStepMm = lineMetrics(descPt, dpi).lineStepMm;

    const codicePt = maxSingleLineFontPt(
      codiceValue,
      textW,
      MIN_CODICE_FONT_PT,
      Math.max(codiceEl.fontPt, marcaEl.fontPt, MAX_CODICE_FONT_PT),
      "mono",
    );
    const altFornCap = Math.max(MIN_ALT_FONT_PT, Math.min(altFornEl.fontPt, descPt - 0.5));
    const altCodCap = Math.max(MIN_ALT_FONT_PT, Math.min(altCodEl.fontPt, descPt - 0.5));
    const altFornPt = altFornitore
      ? maxSingleLineFontPt(altFornitore, textW, MIN_ALT_FONT_PT, altFornCap, "sans")
      : 0;
    const altCodPt = altCodice
      ? maxSingleLineFontPt(altCodice, textW, MIN_ALT_FONT_PT, altCodCap, "mono")
      : 0;

    const tailBlocks: StackBlock[] = [];
    if (codiceValue) {
      tailBlocks.push({ field: "codice", fontPt: codicePt, font: "mono", lines: [codiceValue] });
    }
    if (altFornitore) {
      tailBlocks.push({ field: "fornitoreAlternativo", fontPt: altFornPt, lines: [altFornitore] });
    }
    if (altCodice) {
      tailBlocks.push({ field: "codiceAlternativo", fontPt: altCodPt, font: "mono", lines: [altCodice] });
    }
    const tailH = tailBlocks.length ? stackBottomFromBlocks(0, tailBlocks, descRowStepMm, dpi) : 0;

    let marcaLines = wrapLines(
      fieldValue(payload, "marca"),
      marcaMaxLines,
      maxCharsForWrap(textW, marcaPt),
    );
    ({ fontPt: marcaPt, lines: marcaLines } = shrinkToFitLines(
      marcaLines,
      fieldValue(payload, "marca"),
      marcaMaxLines,
      marcaPt,
      textW,
      MIN_FONT_PT,
    ));

    const descTop = nextRowBaselineMm(top, marcaLines.length, marcaPt, descRowStepMm, dpi);
    const descZoneH = Math.max(0, bottom - descTop - descRowStepMm - tailH);
    const descMaxLines = descZoneH > 0 ? maxLinesForZoneMm(descZoneH, descPt, dpi) : 1;

    let descLines = wrapLines(
      fieldValue(payload, "descrizione"),
      descMaxLines,
      maxCharsForWrap(textW, descPt),
    );
    ({ fontPt: descPt, lines: descLines } = shrinkToFitLines(
      descLines,
      fieldValue(payload, "descrizione"),
      descMaxLines,
      descPt,
      textW,
      ABS_MIN_DESC_PT,
    ));

    const blocks: StackBlock[] = [
      { field: "marca", fontPt: marcaPt, lines: marcaLines },
      { field: "descrizione", fontPt: descPt, lines: descLines },
      ...tailBlocks,
    ];

    const placed = assignPositions(textX, top, blocks, descPt, dpi);
    lastAttempt = placed;

    const fullDesc = wrapLines(
      fieldValue(payload, "descrizione"),
      WRAP_LINE_CAP,
      maxCharsForWrap(textW, descPt),
    );
    const descComplete =
      fullDesc.length <= descMaxLines &&
      fullDesc.join("\n") === descLines.join("\n");
    const descFits = linesFitWrapWidth(descLines, textW, descPt);
    const marcaFits = linesFitWrapWidth(marcaLines, textW, marcaPt);
    const stackOk = stackBottomFromBlocks(top, blocks, descRowStepMm, dpi) <= bottom + 0.08;

    if (descComplete && descFits && marcaFits && stackOk) {
      return placed;
    }

    if (marcaPt <= MIN_FONT_PT && descPt <= MIN_FONT_PT) {
      return placed;
    }

    ({ marcaPt, descPt } = shrinkDescFonts(marcaPt, descPt));
  }

  return lastAttempt ?? [];
}
