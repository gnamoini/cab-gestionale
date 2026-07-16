export type HybridFieldSource = "pdf_text" | "template_ocr" | "gemini";

export type HybridField = {
  key: string;
  value: string | null;
  confidence: number;
  source: HybridFieldSource;
  pageIndex?: number;
};

export type DetectedSchedaBlankTipo = "ingresso" | "lavorazioni" | "ricambi";

export type HybridExtractionResult = {
  schedaTipo: DetectedSchedaBlankTipo | null;
  pdfTextFields: HybridField[];
  templateOcrFields: HybridField[];
  mergedPrefill: HybridField[];
  needsGemini: boolean;
  geminiUserPrompt?: string;
};
