import type { DetectedSchedaBlankTipo, HybridField } from "@/lib/document-capture/extraction/hybrid-extraction-types";
import { normalizeCaptureExtractedFieldKey } from "@/lib/document-capture/capture-field-key-aliases";
import type { AnalyzeTraceEmitter } from "@/lib/document-capture/pipeline/analyze-trace-emitter";

const MIN_TEXT_LAYER_CHARS = 80;

export type PdfTextPage = { pageIndex: number; text: string };

const INGRESSO_LABEL_MAP: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /data\s+ingresso\s*[:.]?\s*(.+)/i, key: "data_ingresso" },
  { pattern: /cliente\s*[:.]?\s*(.+)/i, key: "cliente" },
  { pattern: /cantiere\s*[:.]?\s*(.+)/i, key: "cantiere" },
  { pattern: /utilizzatore\s*[:.]?\s*(.+)/i, key: "utilizzatore" },
  { pattern: /nome\s*[:.]?\s*(.+)/i, key: "nome" },
  { pattern: /cognome\s*[:.]?\s*(.+)/i, key: "cognome" },
  { pattern: /telefono\s*[:.]?\s*(.+)/i, key: "telefono" },
  { pattern: /targa\s*[:.]?\s*(.+)/i, key: "targa" },
  { pattern: /targa\s*\/\s*matricola\s*[:.]?\s*(.+)/i, key: "targa_matricola" },
];

export function detectSchedaTipoFromText(text: string): DetectedSchedaBlankTipo | null {
  const upper = text.toUpperCase();
  if (upper.includes("SCHEDA INGRESSO MACCHINA")) return "ingresso";
  if (upper.includes("SCHEDA LAVORAZIONI")) return "lavorazioni";
  if (upper.includes("SCHEDA RICAMBI")) return "ricambi";
  return null;
}

export function mapPdfTextLinesToFields(lines: string[]): HybridField[] {
  const fields: HybridField[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;
    for (const { pattern, key } of INGRESSO_LABEL_MAP) {
      const m = line.match(pattern);
      if (!m?.[1]) continue;
      const value = m[1].trim();
      if (!value || value.length < 1) continue;
      const normalizedKey = normalizeCaptureExtractedFieldKey(key);
      if (seen.has(normalizedKey)) continue;
      seen.add(normalizedKey);
      fields.push({
        key: normalizedKey,
        value,
        confidence: 0.85,
        source: "pdf_text",
      });
      break;
    }
  }
  return fields;
}

async function extractPdfTextPages(bytes: Uint8Array): Promise<PdfTextPage[]> {
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
    pages.push({ pageIndex: i - 1, text });
  }
  return pages;
}

export function detectSchedaTipoFromPdfPages(pages: PdfTextPage[]): DetectedSchedaBlankTipo | null {
  for (const page of pages) {
    const tipo = detectSchedaTipoFromText(page.text);
    if (tipo) return tipo;
  }
  return null;
}

/** Tier 0 — testo nativo PDF (PDF digitali CAB). Scan puri → array vuoto. */
export async function extractNativePdfTextFields(
  bytes: Uint8Array,
  mime: string,
  trace?: AnalyzeTraceEmitter,
): Promise<{
  pages: PdfTextPage[];
  fields: HybridField[];
  hasTextLayer: boolean;
}> {
  if (!mime.toLowerCase().includes("pdf")) {
    return { pages: [], fields: [], hasTextLayer: false };
  }
  try {
    trace?.emit("PDFJS_TEXT_START", "ok");
    const pages = await extractPdfTextPages(bytes);
    const totalChars = pages.reduce((n, p) => n + p.text.length, 0);
    if (totalChars < MIN_TEXT_LAYER_CHARS) {
      return { pages, fields: [], hasTextLayer: false };
    }
    const fields: HybridField[] = [];
    for (const page of pages) {
      const lines = page.text.split(/\n|(?<=[.:])\s+/);
      const mapped = mapPdfTextLinesToFields(lines);
      for (const f of mapped) {
        fields.push({ ...f, pageIndex: page.pageIndex });
      }
    }
    return { pages, fields, hasTextLayer: true };
  } catch {
    return { pages: [], fields: [], hasTextLayer: false };
  }
}

export function detectSchedaTipoFromPdfText(pages: PdfTextPage[]): DetectedSchedaBlankTipo | null {
  return detectSchedaTipoFromPdfPages(pages);
}
