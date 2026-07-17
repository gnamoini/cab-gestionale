export const LABEL_PDF_GENERATION_TIMEOUT_MS_DEFAULT = 240_000;

export function resolveLabelPdfGenerationTimeoutMs(): number {
  const raw = Number(process.env.LABEL_PDF_GENERATION_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : LABEL_PDF_GENERATION_TIMEOUT_MS_DEFAULT;
}

export class LabelPdfTimeoutError extends Error {
  readonly code = "LABEL_PDF_TIMEOUT" as const;

  constructor(ms: number) {
    super(`Generazione PDF etichette scaduta dopo ${Math.round(ms / 1000)}s`);
    this.name = "LabelPdfTimeoutError";
  }
}

export async function withLabelPdfTimeout<T>(
  fn: () => Promise<T>,
  ms = resolveLabelPdfGenerationTimeoutMs(),
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new LabelPdfTimeoutError(ms)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
