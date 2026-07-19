import { jsPDF } from "jspdf";
import { zipSync } from "fflate";
import type { LabelPayload, LabelRenderOptions, LabelTemplateDefinition } from "@/lib/inventory-labels/domain/types";
import {
  renderLabelPng,
  renderLabelPngFallback,
  renderLabelSvgBytes,
} from "@/lib/inventory-labels/render/png";
import { computeA4Grid } from "@/lib/inventory-labels/render/print-layout";
import {
  mapWithConcurrency,
  readPeakHeapMb,
  resolveLabelPdfRenderConcurrency,
} from "@/lib/inventory-labels/render/pdf-concurrency";
import { withLabelPdfTimeout } from "@/lib/inventory-labels/render/pdf-timeout";

const A4_W_MM = 210;
const A4_H_MM = 297;

export type BulkPdfPipelineMode = "primary" | "fallback" | "emergency";

export type BulkPdfRenderResult =
  | { kind: "pdf"; bytes: Uint8Array; pipeline: BulkPdfPipelineMode; peakHeapMb: number }
  | { kind: "zip"; bytes: Uint8Array; pipeline: "emergency"; peakHeapMb: number };

type LabelItem = { payload: LabelPayload; qrUrl: string };

export function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^\w.-]+/g, "_").slice(0, 48) || "etichetta";
}

async function rasterizePngs(
  template: LabelTemplateDefinition,
  items: LabelItem[],
  renderOne: (item: LabelItem) => Promise<Buffer>,
  concurrency: number,
): Promise<Buffer[]> {
  return mapWithConcurrency(items, concurrency, (item) => renderOne(item));
}

export function assembleMultiLabelPdf(
  template: LabelTemplateDefinition,
  items: LabelItem[],
  pngs: Buffer[],
): Uint8Array {
  const grid = computeA4Grid(template);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let col = 0;
  let row = 0;

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && col === 0 && row === 0) doc.addPage();
    const png = pngs[i]!;
    const x = grid.marginMm + col * (template.widthMm + grid.gapMm);
    const y = grid.marginMm + row * (template.heightMm + grid.gapMm);
    doc.addImage(new Uint8Array(png), "PNG", x, y, template.widthMm, template.heightMm, undefined, "FAST");

    col++;
    if (col >= grid.cols) {
      col = 0;
      row++;
    }
    if (row >= grid.rows) {
      row = 0;
      if (i < items.length - 1) doc.addPage();
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

/** ponytail: HTML fallback = reduced-DPI raster grid — no headless browser on Lambda */
async function renderMultiLabelPdfFallback(
  template: LabelTemplateDefinition,
  items: LabelItem[],
  renderOptions?: LabelRenderOptions,
): Promise<Uint8Array> {
  const pngs = await rasterizePngs(
    template,
    items,
    (item) => renderLabelPngFallback(template, item.payload, item.qrUrl, renderOptions),
    1,
  );
  return assembleMultiLabelPdf(template, items, pngs);
}

type EmergencyZipEntry = { ext: "png" | "svg"; bytes: Buffer };

function renderEmergencyLabelZip(items: LabelItem[], entries: EmergencyZipEntry[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < items.length; i++) {
    const code = sanitizeFilenamePart(items[i]!.payload.codice || `item-${i + 1}`);
    const entry = entries[i]!;
    files[`etichetta-${code}.${entry.ext}`] = new Uint8Array(entry.bytes);
  }
  return zipSync(files, { level: 1 });
}

async function renderEmergencyZip(
  template: LabelTemplateDefinition,
  items: LabelItem[],
  renderOptions?: LabelRenderOptions,
): Promise<Uint8Array> {
  const entries: EmergencyZipEntry[] = [];
  for (const item of items) {
    try {
      entries.push({
        ext: "png",
        bytes: await renderLabelPngFallback(template, item.payload, item.qrUrl, renderOptions),
      });
    } catch {
      const svg = await renderLabelSvgBytes(template, item.payload, item.qrUrl, renderOptions);
      entries.push({ ext: "svg", bytes: svg });
    }
  }
  return renderEmergencyLabelZip(items, entries);
}

export async function renderMultiLabelPdfWithPipeline(
  template: LabelTemplateDefinition,
  items: LabelItem[],
  options?: LabelRenderOptions & { onProgress?: (done: number, total: number) => void | Promise<void> },
): Promise<BulkPdfRenderResult> {
  const total = items.length;
  const concurrency = resolveLabelPdfRenderConcurrency();
  const renderOptions: LabelRenderOptions = { includeBarcode: options?.includeBarcode };
  let peakHeapMb = readPeakHeapMb();

  const tickProgress = async (done: number) => {
    peakHeapMb = Math.max(peakHeapMb, readPeakHeapMb());
    await options?.onProgress?.(done, total);
  };

  try {
    const pngs = await withLabelPdfTimeout(async () => {
      let done = 0;
      return mapWithConcurrency(items, concurrency, async (item) => {
        const png = await renderLabelPng(template, item.payload, item.qrUrl, renderOptions);
        done += 1;
        await tickProgress(done);
        return png;
      });
    });

    const bytes = assembleMultiLabelPdf(template, items, pngs);
    peakHeapMb = Math.max(peakHeapMb, readPeakHeapMb());
    console.info(
      `[label-pdf] concurrency=${concurrency} count=${total} peakHeap=${peakHeapMb}MiB pipeline=primary`,
    );
    return { kind: "pdf", bytes, pipeline: "primary", peakHeapMb };
  } catch (primaryError) {
    console.warn("[label-pdf] primary failed, trying fallback", {
      message: primaryError instanceof Error ? primaryError.message : String(primaryError),
    });
  }

  try {
    const bytes = await withLabelPdfTimeout(() => renderMultiLabelPdfFallback(template, items, renderOptions));
    peakHeapMb = Math.max(peakHeapMb, readPeakHeapMb());
    console.info(`[label-pdf] count=${total} peakHeap=${peakHeapMb}MiB pipeline=fallback`);
    return { kind: "pdf", bytes, pipeline: "fallback", peakHeapMb };
  } catch (fallbackError) {
    console.warn("[label-pdf] fallback failed, emergency ZIP", {
      message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
    });
  }

  const bytes = await renderEmergencyZip(template, items, renderOptions);
  peakHeapMb = Math.max(peakHeapMb, readPeakHeapMb());
  console.info(`[label-pdf] count=${total} peakHeap=${peakHeapMb}MiB pipeline=emergency`);
  return { kind: "zip", bytes, pipeline: "emergency", peakHeapMb };
}

export async function renderSingleLabelPdf(
  template: LabelTemplateDefinition,
  payload: LabelPayload,
  qrUrl: string,
  renderOptions?: LabelRenderOptions,
): Promise<Uint8Array> {
  const result = await renderMultiLabelPdfWithPipeline(template, [{ payload, qrUrl }], renderOptions);
  if (result.kind === "zip") throw new Error("Generazione etichetta singola fallita");
  return result.bytes;
}

export async function renderMultiLabelPdf(
  template: LabelTemplateDefinition,
  items: LabelItem[],
  options?: LabelRenderOptions & { onProgress?: (done: number, total: number) => void | Promise<void> },
): Promise<Uint8Array> {
  const result = await renderMultiLabelPdfWithPipeline(template, items, options);
  if (result.kind === "zip") {
    throw new Error("Generazione PDF fallita — scaricare ZIP emergenza non supportato in questo percorso");
  }
  return result.bytes;
}

export { A4_W_MM, A4_H_MM, resolveLabelPdfRenderConcurrency, readPeakHeapMb };
