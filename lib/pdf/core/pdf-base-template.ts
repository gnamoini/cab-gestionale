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
  drawPdfIdentificationBlock,
  pdfTableDefaults,
  pdfPreventivoVoceTableColumns,
  getAutoTableFinalY,
  ensurePdfSpace,
  drawPdfTotalsSummary,
  drawPdfPageFooters,
  buildAnagraficaPdfFields,
  buildAttrezzaturaPdfFields,
  buildTelaioPdfFields,
  buildIdentificazioneDocumentoPdfFields,
  inferTipoAttrezzaturaPdf,
} from "@/lib/pdf/preventivo-pdf-layout";

export type { PdfField, PreventivoPdfHeaderMeta, PreventivoPdfHeaderMeta as GestionalePdfHeaderMeta } from "@/lib/pdf/preventivo-pdf-layout";
