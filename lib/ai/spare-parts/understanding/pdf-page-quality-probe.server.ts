import "server-only";

import { extractPdfTextPages, pageHasSufficientNativeText } from "@/lib/ai/pdf-text-pages.server";

export type PdfPageQualityKind = "native_sufficient" | "native_insufficient" | "mixed";

export type PdfPageQualityReport = {
  pageQuality: Record<number, PdfPageQualityKind>;
  ocrCandidatePages: number[];
  nativeSufficientPages: number[];
  mixedPages: number[];
};

/** Classifica qualità testo nativo per pagina (1-based). */
export async function probePdfPageQuality(bytes: Uint8Array): Promise<PdfPageQualityReport> {
  const pages = await extractPdfTextPages(bytes);
  const pageQuality: Record<number, PdfPageQualityKind> = {};
  const ocrCandidatePages: number[] = [];
  const nativeSufficientPages: number[] = [];
  const mixedPages: number[] = [];

  for (const page of pages) {
    const sufficient = pageHasSufficientNativeText(page.text);
    const hasSomeText = page.text.trim().length > 20;
    let kind: PdfPageQualityKind;
    if (sufficient) {
      kind = "native_sufficient";
      nativeSufficientPages.push(page.pageNumber);
    } else if (hasSomeText) {
      kind = "mixed";
      mixedPages.push(page.pageNumber);
      ocrCandidatePages.push(page.pageNumber);
    } else {
      kind = "native_insufficient";
      ocrCandidatePages.push(page.pageNumber);
    }
    pageQuality[page.pageNumber] = kind;
  }

  return { pageQuality, ocrCandidatePages, nativeSufficientPages, mixedPages };
}

export function ocrPageRatio(report: PdfPageQualityReport, totalPages: number): number {
  if (totalPages <= 0) return 0;
  return report.ocrCandidatePages.length / totalPages;
}
