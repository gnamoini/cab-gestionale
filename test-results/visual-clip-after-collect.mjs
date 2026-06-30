#!/usr/bin/env node
/**
 * Post-remediation visual clip collect @ 724px — smoke login, after screenshots.
 * Usage: node test-results/visual-clip-after-collect.mjs [baseUrl]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();

function loadEnvFile(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.smoke.local");

const PROBE_EVAL = fs.readFileSync(path.join(ROOT, "test-results/visual-clip-probe-eval.txt"), "utf8");
const OUT = path.join(ROOT, "test-results/visual-clip-runtime-after.json");
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

const SCREENSHOT_ROUTES = new Set(["/dashboard", "/lavorazioni", "/report"]);

async function tryLogin(page) {
  const email = process.env.SMOKE_ADMIN_EMAIL?.trim();
  const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  if (!email || !password) return false;
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("smoke-login-identifier").fill(email);
  await page.getByTestId("smoke-login-password").fill(password);
  await page.getByTestId("smoke-login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 90_000 }).catch(() => null);
  return !page.url().includes("/login");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  if (!(await tryLogin(page))) {
    console.error("Login failed — set SMOKE_ADMIN_* in .env.local");
    await browser.close();
    process.exit(2);
  }

  const sessions = [];
  for (const route of ROUTES) {
    process.stdout.write(`visual-clip-after ${VIEWPORT.width}px ${route}...\n`);
    await page.setViewportSize(VIEWPORT);
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForSelector(".cab-app-shell", { timeout: 60_000 }).catch(() => null);
    await page.waitForTimeout(IDLE_MS);

    const session = await page.evaluate(PROBE_EVAL);

    if (SCREENSHOT_ROUTES.has(route)) {
      await page.evaluate(() => {
        if (typeof window.__cabVisualClipDebugOn === "function") window.__cabVisualClipDebugOn();
      });
      const safeRoute = route.replace(/\//g, "_").replace(/^_/, "") || "root";
      await page.screenshot({
        path: path.join(ROOT, `test-results/visual-clip-after-${safeRoute}.png`),
        fullPage: false,
      });
      await page.evaluate(() => {
        if (typeof window.__cabVisualClipDebugOff === "function") window.__cabVisualClipDebugOff();
      });
    }

    sessions.push({ route, viewport: "724", viewportWidth: 724, url: page.url(), session });
  }

  await browser.close();

  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        collectedAt: new Date().toISOString(),
        baseUrl: BASE,
        viewport: VIEWPORT,
        login: { loggedIn: true, reason: "smoke_admin" },
        sessionCount: sessions.length,
        sessions,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${OUT} (${sessions.length} sessions)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
