#!/usr/bin/env node
/**
 * Automated boot investigation collection (dev server must be running).
 * Requires NEXT_PUBLIC_BOOT_INVESTIGATION=1 in env when starting dev server.
 *
 * Usage: node scripts/ops/boot-investigation-collect.mjs [baseUrl]
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
const OUT_DIR = path.join(ROOT, "test-results");
const OUT_FILE = path.join(OUT_DIR, "boot-investigation.json");
const BASE = process.argv[2] ?? "http://localhost:3000";
const IDLE_MS = process.env.COLLECT_QUICK === "1" ? 8_000 : 30_000;
const NAV_MS = process.env.COLLECT_QUICK === "1" ? 5_000 : 15_000;

const VIEWPORTS = [
  { label: "cursor_724", width: 724, height: 900 },
  { label: "mobile_390", width: 390, height: 844 },
  { label: "desktop_1440", width: 1440, height: 900 },
];

async function tryLogin(page) {
  const email = process.env.SMOKE_ADMIN_EMAIL?.trim();
  const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  if (!email || !password) return { loggedIn: false, reason: "missing SMOKE_ADMIN_* env" };
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("smoke-login-identifier").fill(email);
  await page.getByTestId("smoke-login-password").fill(password);
  await page.getByTestId("smoke-login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 90_000 }).catch(() => null);
  const loggedIn = !page.url().includes("/login");
  return { loggedIn, reason: loggedIn ? "ok" : "still_on_login" };
}

async function collectViewport(page, vp) {
  await page.addInitScript(() => {
    window.__cabForceNavDiagnostics = true;
  });
  const login = await tryLogin(page);
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector(".cab-app-shell", { timeout: 120_000 }).catch(() => null);
  await page.waitForTimeout(IDLE_MS);
  await page.goto(`${BASE}/lavorazioni`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(NAV_MS);

  return page.evaluate(() => {
    const inv = window.__cabBootInvestigation?.();
    const render = window.__cabRenderAudit?.(10);
    const pending = window.__cabPendingQueries?.(10_000);
    const coldStart = window.__cabColdStartReport ?? null;
    const navBoot = window.__cabNavBootTimeline ?? null;
    const waterfall = window.__cabNavHttpWaterfall ?? null;
    return {
      innerWidth: window.innerWidth,
      pathname: window.location.pathname,
      investigation: inv ?? null,
      coldStartReport: coldStart,
      navBootTimeline: navBoot,
      navHttpWaterfall: waterfall,
      renderAudit: render ?? null,
      pendingQueries: pending ?? [],
    };
  }).then((payload) => ({ ...payload, login }));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (/\[(BOOT|MOUNT|UNMOUNT|AUTH|QUERY|REDIRECT|RENDER|STORE_UPDATE)\]/.test(text)) {
      consoleLogs.push({ ts: Date.now(), type: msg.type(), text });
    }
  });

  const results = {
    collectedAt: new Date().toISOString(),
    baseUrl: BASE,
    viewports: {},
    consoleSample: [],
  };

  for (const vp of VIEWPORTS) {
    console.log(`Collecting ${vp.label} (${vp.width}px)...`);
    try {
      results.viewports[vp.label] = await collectViewport(page, vp);
    } catch (e) {
      results.viewports[vp.label] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  results.consoleSample = consoleLogs.slice(-200);
  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
  console.log(`Wrote ${OUT_FILE}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
