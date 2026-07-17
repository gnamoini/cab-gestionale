/** ponytail: adaptive cap — upgrade path: benchmark-driven table in ADR-006 */
export function resolveLabelPdfRenderConcurrency(): number {
  const raw = Number(process.env.LABEL_PDF_RENDER_CONCURRENCY);
  return Number.isFinite(raw) ? Math.min(8, Math.max(2, raw)) : 4;
}

export function readPeakHeapMb(): number {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}
