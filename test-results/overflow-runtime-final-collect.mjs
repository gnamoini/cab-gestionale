#!/usr/bin/env node
/**
 * Runtime collection with session cookies exported from Cursor browser (document.cookie).
 * Cookie file is gitignored — do not commit.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PROBE_EVAL = fs.readFileSync(path.join(ROOT, "test-results/overflow-runtime-probe-eval.txt"), "utf8");
const COOKIE_FILE = path.join(ROOT, "test-results/.overflow-session-cookies.tmp");
const OUT = path.join(ROOT, "test-results/overflow-runtime-final.json");
const BASE = process.argv[2] ?? "http://localhost:3000";
const VIEWPORT = { width: 724, height: 900 };
const IDLE_MS = 6000;

const ROUTES = [
  "/dashboard",
  "/lavorazioni",
  "/lavorazioni-clienti",
  "/preventivi",
  "/documenti",
  "/magazzino",
  "/mezzi",
  "/dipendenti",
  "/bunder",
  "/report",
  "/impostazioni",
  "/dashboard/security",
];

function parseCookieHeader(header, baseUrl) {
  const u = new URL(baseUrl);
  return header
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf("=");
      if (i <= 0) return null;
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (!name || !value) return null;
      return {
        name,
        value,
        domain: u.hostname,
        path: "/",
        sameSite: "Lax",
      };
    })
    .filter(Boolean);
}

async function main() {
  if (!fs.existsSync(COOKIE_FILE)) {
    console.error(`Missing ${COOKIE_FILE} — export document.cookie from logged-in browser first`);
    process.exit(2);
  }

  const cookieHeader = fs.readFileSync(COOKIE_FILE, "utf8").trim();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  await context.addCookies(parseCookieHeader(cookieHeader, BASE));
  const page = await context.newPage();

  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(3000);
  const hasShell = await page.evaluate(() => !!document.querySelector(".cab-app-shell"));
  if (!hasShell) {
    console.error("Cookie session invalid — no .cab-app-shell");
    await browser.close();
    process.exit(2);
  }

  const sessions = [];
  for (const route of ROUTES) {
    process.stdout.write(`probe ${VIEWPORT.width}px ${route}...\n`);
    await page.setViewportSize(VIEWPORT);
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForSelector(".cab-app-shell", { timeout: 60_000 }).catch(() => null);
    await page.waitForTimeout(IDLE_MS);

    const session = await page.evaluate(PROBE_EVAL);
    sessions.push({ route, viewport: "724", viewportWidth: 724, url: page.url(), session });
  }

  await browser.close();

  const payload = {
    collectedAt: new Date().toISOString(),
    baseUrl: BASE,
    viewport: VIEWPORT,
    login: { loggedIn: true, reason: "document_cookie_export" },
    sessionCount: sessions.length,
    sessions,
  };

  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT} (${sessions.length} sessions)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
