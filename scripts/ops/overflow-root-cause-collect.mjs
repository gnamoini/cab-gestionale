#!/usr/bin/env node
/**
 * Automated overflow root-cause collection (dev server must be running).
 * Requires NEXT_PUBLIC_OVERFLOW_ROOT_CAUSE_AUDIT=1 when starting dev server.
 *
 * Usage: node scripts/ops/overflow-root-cause-collect.mjs [baseUrl]
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
const OUT_FILE = path.join(OUT_DIR, "overflow-root-cause-audit.json");
const BASE = process.argv[2] ?? "http://localhost:3000";
const IDLE_MS = process.env.COLLECT_QUICK === "1" ? 5_000 : 8_000;
const ROUTE_TIMEOUT_MS = process.env.COLLECT_QUICK === "1" ? 60_000 : 120_000;

const VIEWPORTS = [
  { label: "390", width: 390, height: 844 },
  { label: "724", width: 724, height: 900 },
  { label: "768", width: 768, height: 1024 },
  { label: "1024", width: 1024, height: 900 },
  { label: "1362", width: 1362, height: 900 },
  { label: "1440", width: 1440, height: 900 },
];

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

async function tryLogin(page) {
  const email = process.env.SMOKE_ADMIN_EMAIL?.trim();
  const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  if (!email || !password) return { loggedIn: false, reason: "missing SMOKE_ADMIN_* env" };

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: ROUTE_TIMEOUT_MS });
  await page.getByTestId("smoke-login-identifier").fill(email);
  await page.getByTestId("smoke-login-password").fill(password);
  await page.getByTestId("smoke-login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 90_000 }).catch(() => null);
  const loggedIn = !page.url().includes("/login");
  return { loggedIn, reason: loggedIn ? "ok" : "still_on_login" };
}

async function collectRoute(page, route, vp) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: ROUTE_TIMEOUT_MS });
  await page.waitForSelector(".cab-app-shell", { timeout: ROUTE_TIMEOUT_MS }).catch(() => null);
  await page.waitForTimeout(IDLE_MS);

  const audit = await page.evaluate(() => {
    const fn = window.__cabOverflowAudit;
    if (typeof fn !== "function") {
      return {
        error: "__cabOverflowAudit not available — start dev with NEXT_PUBLIC_OVERFLOW_ROOT_CAUSE_AUDIT=1",
        pathname: window.location.pathname,
        innerWidth: window.innerWidth,
      };
    }
    return fn();
  });

  return {
    route,
    viewport: vp.label,
    viewportWidth: vp.width,
    url: page.url(),
    audit,
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const overflowConsole = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[OVERFLOW]")) {
      overflowConsole.push({ ts: Date.now(), type: msg.type(), text: text.slice(0, 2000) });
    }
  });

  const login = await tryLogin(page);

  const sessions = [];
  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      process.stdout.write(`collect ${vp.label}px ${route}...\n`);
      try {
        const session = await collectRoute(page, route, vp);
        sessions.push(session);
      } catch (err) {
        sessions.push({
          route,
          viewport: vp.label,
          viewportWidth: vp.width,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  await browser.close();

  const payload = {
    collectedAt: new Date().toISOString(),
    baseUrl: BASE,
    login,
    viewports: VIEWPORTS.map((v) => v.label),
    routes: ROUTES,
    sessionCount: sessions.length,
    sessions,
    overflowConsoleSample: overflowConsole.slice(0, 50),
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT_FILE} (${sessions.length} sessions, login=${login.loggedIn})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
