export type ExtractionQualityInput = {
  partsExtracted: number;
  pagesProcessed: number;
  chunkSuccessRate: number;
  partsWithPageEvidence: number;
  ocrPageRatio?: number;
  isListino?: boolean;
  listinoFailedChunks?: number;
};

export type ExtractionQualityResult = {
  understandingStatus: "ready" | "ready_with_warnings" | "failed";
  indexQuality: "high" | "medium" | "low" | "failed";
  extractionReliability: "reliable" | "partial" | "not_interpretable";
  warnings: string[];
};

const CHUNK_SUCCESS_READY = 0.85;
const CHUNK_SUCCESS_WARN = 0.5;
const OCR_WARN_RATIO = 0.35;

export function evaluateExtractionQuality(input: ExtractionQualityInput): ExtractionQualityResult {
  const warnings: string[] = [];

  if (input.partsExtracted === 0 || input.pagesProcessed === 0) {
    return {
      understandingStatus: "failed",
      indexQuality: "failed",
      extractionReliability: "not_interpretable",
      warnings: ["Nessuna riga ricambio estratta dal documento."],
    };
  }

  if (input.chunkSuccessRate < CHUNK_SUCCESS_WARN) {
    return {
      understandingStatus: "failed",
      indexQuality: "failed",
      extractionReliability: "not_interpretable",
      warnings: [
        `Troppi blocchi falliti (${Math.round(input.chunkSuccessRate * 100)}% successo).`,
      ],
    };
  }

  if (input.partsWithPageEvidence === 0) {
    return {
      understandingStatus: "failed",
      indexQuality: "failed",
      extractionReliability: "not_interpretable",
      warnings: ["Nessuna evidence con numero pagina tracciabile."],
    };
  }

  if (input.isListino && (input.listinoFailedChunks ?? 0) > 0) {
    warnings.push(`${input.listinoFailedChunks} blocchi listino non analizzati.`);
  }

  let understandingStatus: ExtractionQualityResult["understandingStatus"] = "ready";
  let indexQuality: ExtractionQualityResult["indexQuality"] = "medium";
  let extractionReliability: ExtractionQualityResult["extractionReliability"] = "reliable";

  if (input.chunkSuccessRate < CHUNK_SUCCESS_READY) {
    understandingStatus = "ready_with_warnings";
    indexQuality = "low";
    extractionReliability = "partial";
    warnings.push(
      `Successo blocchi ${Math.round(input.chunkSuccessRate * 100)}% — sotto soglia ${Math.round(CHUNK_SUCCESS_READY * 100)}%.`,
    );
  }

  const ocrRatio = input.ocrPageRatio ?? 0;
  if (ocrRatio > OCR_WARN_RATIO) {
    understandingStatus = "ready_with_warnings";
    if (indexQuality === "medium") indexQuality = "low";
    extractionReliability = "partial";
    warnings.push(`OCR usato su ${Math.round(ocrRatio * 100)}% delle pagine.`);
  }

  if (input.partsExtracted < 3 && input.pagesProcessed > 10) {
    understandingStatus = "ready_with_warnings";
    indexQuality = "low";
    extractionReliability = "partial";
    warnings.push("Poche righe estratte rispetto al numero di pagine.");
  }

  return { understandingStatus, indexQuality, extractionReliability, warnings };
}
