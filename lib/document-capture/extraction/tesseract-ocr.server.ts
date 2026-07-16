import "server-only";

import sharp from "sharp";

type OcrMode = "single_line" | "block";

let workerPromise: Promise<import("tesseract.js").Worker | null> | null = null;

const TESSERACT_INIT_TIMEOUT_MS = 20_000;
const TESSERACT_RECOGNIZE_TIMEOUT_MS = 12_000;

async function initTesseractWorker(): Promise<import("tesseract.js").Worker | null> {
  try {
    const { createWorker, PSM } = await import("tesseract.js");
    const worker = await createWorker("ita+eng", 1, {
      logger: () => {},
    });
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    });
    return worker;
  } catch {
    return null;
  }
}

async function getTesseractWorker(): Promise<import("tesseract.js").Worker | null> {
  if (!workerPromise) {
    workerPromise = Promise.race([
      initTesseractWorker(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), TESSERACT_INIT_TIMEOUT_MS);
      }),
    ]);
  }
  return workerPromise;
}

function mapTesseractConfidence(raw: number): number {
  const normalized = Math.max(0, Math.min(1, raw / 100));
  return Math.min(0.75, normalized);
}

async function preprocessForOcr(png: Buffer, mode: OcrMode): Promise<Buffer> {
  let pipeline = sharp(png).grayscale().normalize().sharpen({ sigma: 0.8 });
  if (mode === "single_line") {
    pipeline = pipeline.resize({ height: 48, fit: "contain", background: "#ffffff" });
  }
  return pipeline.png().toBuffer();
}

/** OCR locale Tesseract su crop PNG. */
export async function recognizePngBuffer(
  png: Buffer,
  mode: OcrMode = "single_line",
): Promise<{ text: string; confidence: number }> {
  const worker = await getTesseractWorker();
  if (!worker) return { text: "", confidence: 0 };
  const { PSM } = await import("tesseract.js");
  const preprocessed = await preprocessForOcr(png, mode);
  await worker.setParameters({
    tessedit_pageseg_mode: mode === "block" ? PSM.SINGLE_BLOCK : PSM.SINGLE_LINE,
  });
  let result: Awaited<ReturnType<typeof worker.recognize>>;
  try {
    result = await Promise.race([
      worker.recognize(preprocessed),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("tesseract_recognize_timeout")), TESSERACT_RECOGNIZE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return { text: "", confidence: 0 };
  }
  const text =
    mode === "block"
      ? result.data.text
          .replace(/\r\n/g, "\n")
          .split("\n")
          .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
          .filter((line) => line.length > 0)
          .join("\n")
          .trim()
      : result.data.text.replace(/\s+/g, " ").trim();
  const confidence = mapTesseractConfidence(result.data.confidence);
  return { text, confidence };
}

export async function recognizePngBuffersPool(
  items: Array<{ id: string; png: Buffer; mode?: OcrMode }>,
  _concurrency = 1,
): Promise<Map<string, { text: string; confidence: number }>> {
  const out = new Map<string, { text: string; confidence: number }>();
  // ponytail: worker Tesseract singleton — recognize() non è concorrente; pool sequenziale
  for (const current of items) {
    const result = await recognizePngBuffer(current.png, current.mode ?? "single_line");
    out.set(current.id, result);
  }
  return out;
}
