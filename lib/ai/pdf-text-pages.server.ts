import "server-only";

export type PdfTextPage = { pageNumber: number; text: string };

const MIN_USEFUL_CHARS = 80;

/** Estrae testo nativo per pagina (1-based pageNumber). */
export async function extractPdfTextPages(bytes: Uint8Array): Promise<PdfTextPage[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = getDocument({
    data: bytes,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const pages: PdfTextPage[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ pageNumber: i, text });
  }
  return pages;
}

export function pageHasSufficientNativeText(text: string, minChars = MIN_USEFUL_CHARS): boolean {
  const useful = text.replace(/[^\p{L}\p{N}]/gu, "");
  return useful.length >= minChars;
}
