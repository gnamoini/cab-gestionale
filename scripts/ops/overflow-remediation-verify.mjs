#!/usr/bin/env node
/**
 * Verify overflow remediation on /preventivi, /dipendenti, /report at 6 viewports.
 * Requires dev server + SMOKE_ADMIN_* in .env.local
 *
 * Usage: node scripts/ops/overflow-remediation-verify.mjs [baseUrl]
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

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = path.join(ROOT, "test-results", "overflow-remediation-verify.json");

const VIEWPORTS = [
  { label: "390", width: 390, height: 844 },
  { label: "724", width: 724, height: 900 },
  { label: "768", width: 768, height: 1024 },
  { label: "1024", width: 1024, height: 900 },
  { label: "1362", width: 1362, height: 900 },
  { label: "1440", width: 1440, height: 900 },
];

const ROUTES = ["/preventivi", "/dipendenti", "/report"];

async function tryLogin(page) {
  const email = process.env.SMOKE_ADMIN_EMAIL?.trim();
  const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  if (!email || !password) return { loggedIn: false, reason: "missing SMOKE_ADMIN_* env" };
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("smoke-login-identifier").fill(email);
  await page.getByTestId("smoke-login-password").fill(password);
  await page.getByTestId("smoke-login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 90_000 }).catch(() => null);
  return { loggedIn: !page.url().includes("/login"), reason: "ok" };
}

async function audit(page) {
  return page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const shell = document.querySelector(".cab-app-shell");
    const main = document.querySelector("main.gestionale-scroll-y, main");
    const doc = document.documentElement;
    const shellOk =
      !shell || (shell instanceof HTMLElement && shell.scrollWidth <= shell.clientWidth + 2);
    const mainOk =
      !main || (main instanceof HTMLElement && main.scrollWidth <= main.clientWidth + 2);
    const docOk = doc.scrollWidth <= doc.clientWidth + 2;
    return {
      ok: shellOk && mainOk && docOk,
      innerWidth,
      document: { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth },
      main: main instanceof HTMLElement ? { scrollWidth: main.scrollWidth, clientWidth: main.clientWidth } : null,
    };
  });
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const login = await tryLogin(page);
  const sessions = [];

  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForSelector(".cab-app-shell", { timeout: 60_000 }).catch(() => null);
      await page.waitForTimeout(5_000);
      const result = await audit(page);
      sessions.push({ route, viewport: vp.label, ...result, url: page.url() });
      process.stdout.write(`${vp.label}px ${route} ok=${result.ok}\n`);
    }
  }

  await browser.close();

  const payload = {
    collectedAt: new Date().toISOString(),
    baseUrl: BASE,
    login,
    passCount: sessions.filter((s) => s.ok).length,
    failCount: sessions.filter((s) => !s.ok).length,
    sessions,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT} pass=${payload.passCount} fail=${payload.failCount}`);
  if (!login.loggedIn) process.exitCode = 0;
  else if (payload.failCount > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
