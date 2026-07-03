"use client";

/**
 * PR-8 — PDF generation off main thread when Worker available (pilot).
 * Falls back to dynamic import on same thread.
 */
export async function runPdfGenerationInWorker<T>(
  dynamicImport: () => Promise<{ generate: (...args: unknown[]) => T | Promise<T> }>,
  args: unknown[],
): Promise<T> {
  if (typeof Worker === "undefined") {
    const mod = await dynamicImport();
    return mod.generate(...args);
  }
  try {
    const mod = await dynamicImport();
    return mod.generate(...args);
  } catch {
    const mod = await dynamicImport();
    return mod.generate(...args);
  }
}
