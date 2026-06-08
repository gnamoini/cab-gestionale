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

/** WebKit (Playwright mobile-ios) segnala alcuni fetch cross-origin Supabase come pageerror non bloccanti. */
const PAGEERROR_IGNORE_PATTERNS = [
  /supabase\.co\/auth\/v1\/user due to access control checks/i,
  /due to access control checks\.?$/i,
];

export function attachConsoleGuards(page: Page): void {
  const seen = new Set<string>();

  page.on("pageerror", (err) => {
    const message = err.message;
    if (PAGEERROR_IGNORE_PATTERNS.some((re) => re.test(message))) return;
    throw new Error(`pageerror: ${message}`);
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
