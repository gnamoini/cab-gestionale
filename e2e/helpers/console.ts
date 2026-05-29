import type { Page } from "@playwright/test";

const CRITICAL_PATTERNS = [
  /hydration failed/i,
  /hydration mismatch/i,
  /uncaught/i,
  /chunkloaderror/i,
];

const IGNORE_PATTERNS = [
  /favicon/i,
  /failed to load resource.*404/i,
  /devtools/i,
];

export function attachConsoleGuards(page: Page): void {
  const seen = new Set<string>();

  page.on("pageerror", (err) => {
    throw new Error(`pageerror: ${err.message}`);
  });

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORE_PATTERNS.some((re) => re.test(text))) return;
    if (seen.has(text)) return;
    seen.add(text);
    if (CRITICAL_PATTERNS.some((re) => re.test(text))) {
      throw new Error(`console.error: ${text}`);
    }
  });
}
