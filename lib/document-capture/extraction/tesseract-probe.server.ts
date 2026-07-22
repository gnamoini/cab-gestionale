import "server-only";

const TESSERACT_PROBE_TIMEOUT_MS = 3_000;

/** Probe leggero — non inizializza worker completo. */
export async function probeTesseractAvailability(): Promise<{ available: boolean; detail?: string }> {
  try {
    const result = await Promise.race([
      (async () => {
        await import("tesseract.js");
        return { available: true as const };
      })(),
      new Promise<{ available: false; detail: string }>((resolve) => {
        setTimeout(() => resolve({ available: false, detail: "import timeout" }), TESSERACT_PROBE_TIMEOUT_MS);
      }),
    ]);
    return result;
  } catch (e) {
    return { available: false, detail: e instanceof Error ? e.message : String(e) };
  }
}
