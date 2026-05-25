/**
 * Template PDF unificato gestionale — layout condiviso (preventivi, consuntivi, schede).
 * Implementazione master: `lib/pdf/preventivo-pdf-layout.ts`.
 */
export {
  PDF_MARGIN_L,
  PDF_MARGIN_R,
  PDF_MARGIN_TOP,
  PDF_FOOTER_Y,
  PDF_SECTION_GAP,
  PDF_SECTION_CONTENT_GAP,
  PDF_COMPANY_NAME,
  PDF_PREVENTIVO_IVA_PERCENT,
  pdfContentWidth,
  fmtEuroPdf,
  fmtDateIt,
  drawPdfHorizontalRule,
  pdfAdvanceSection,
  drawPreventivoPdfHeader,
  drawPreventivoPdfHeader as drawGestionalePdfHeader,
  drawPdfSectionTitle,
  drawPdfFieldGrid,
  drawPdfLabeledParagraph,
  drawPdfSectionPanelGrid,
  drawPdfSectionPanelParagraphs,
  drawPdfIdentificationBlock,
  pdfTableDefaults,
  pdfPreventivoVoceTableColumns,
  getAutoTableFinalY,
  ensurePdfSpace,
  drawPdfTotalsSummary,
  drawPdfPageFooters,
  buildAnagraficaPdfFields,
  buildAttrezzaturaPdfFields,
  buildPreventivoAttrezzaturaPdfFields,
  buildPreventivoMezzoPdfFields,
  buildPreventivoTelaioMezzoPdfFields,
  buildTelaioPdfFields,
  buildIdentificazioneDocumentoPdfFields,
  inferTipoAttrezzaturaPdf,
} from "@/lib/pdf/preventivo-pdf-layout";

export type { PdfField, PreventivoPdfHeaderMeta, PreventivoPdfHeaderMeta as GestionalePdfHeaderMeta } from "@/lib/pdf/preventivo-pdf-layout";

export {
  PDF_DS_SECTION_GAP,
  PDF_DS_ROW_PAD,
  PDF_DS_ROW_PAD_MULTILINE,
  PDF_DS_HEAD_PAD_V,
  PDF_DS_HEAD_PAD_H,
  PDF_DS_MULTILINE_MIN_H,
  PDF_DS_COL_LABEL_RATIO,
  cleanPdfFieldValue,
  pdfFieldFromValue,
  pdfFieldsToBody,
  drawGestionaleFieldSectionTable,
  drawGestionaleDataSectionTable,
  drawGestionaleSideBySideFieldSections,
  drawGestionaleSideBySideMetricBoxes,
  padPdfFieldsToEqualRows,
  gestionaleSectionTableHooks,
} from "@/lib/pdf/gestionale-section-table";

export type { GestionaleFieldSectionOpts, GestionaleDataSectionTotal, GestionaleSideBySidePanel, GestionaleMetricBox } from "@/lib/pdf/gestionale-section-table";
