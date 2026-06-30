#!/usr/bin/env node
/**
 * Visual clip remediation verify — scrollWidth invariant + paint bleed probe.
 * Requires dev server + SMOKE_ADMIN_* in .env.local (or cookie export for collect).
 *
 * Usage: node scripts/ops/visual-clip-remediation-verify.mjs [baseUrl]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PROBE_EVAL = fs.existsSync(path.join(ROOT, "test-results/visual-clip-probe-eval.txt"))
  ? fs.readFileSync(path.join(ROOT, "test-results/visual-clip-probe-eval.txt"), "utf8")
  : null;
const OUT = path.join(ROOT, "test-results", "visual-clip-remediation-verify.json");

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
  "/magazzino",
  "/preventivi",
  "/report",
  "/impostazioni",
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
  return { loggedIn: !page.url().includes("/login"), reason: "ok" };
}

async function auditOverflow(page) {
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
      shell:
        shell instanceof HTMLElement
          ? { scrollWidth: shell.scrollWidth, clientWidth: shell.clientWidth }
          : null,
      main:
        main instanceof HTMLElement
          ? { scrollWidth: main.scrollWidth, clientWidth: main.clientWidth }
          : null,
    };
  });
}

function summarizeVisualBleed(session) {
  const bleed = session?.visualBleed ?? [];
  const clipped = bleed.filter((b) => b.clipAncestor);
  const byClipper = new Map();
  for (const b of clipped) {
    const key = b.clipAncestor?.selector?.split(".").slice(0, 2).join(".") ?? "?";
    byClipper.set(key, (byClipper.get(key) ?? 0) + 1);
  }
  return {
    clippedBleedCount: clipped.length,
    rawClipHitCount: session?.rawClipHitCount ?? 0,
    rootClipperCount: session?.rootClippers?.length ?? 0,
    byClipper: Object.fromEntries(byClipper),
  };
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

      const overflow = await auditOverflow(page);
      let visual = null;
      if (PROBE_EVAL && vp.label === "724") {
        visual = await page.evaluate(PROBE_EVAL);
      }

      const entry = {
        route,
        viewport: vp.label,
        overflow,
        visual: visual ? summarizeVisualBleed(visual) : null,
        url: page.url(),
      };
      sessions.push(entry);
      const bleedNote = visual ? ` bleed=${entry.visual.clippedBleedCount}` : "";
      process.stdout.write(`${vp.label}px ${route} overflowOk=${overflow.ok}${bleedNote}\n`);
    }
  }

  await browser.close();

  const overflowFails = sessions.filter((s) => !s.overflow.ok);
  const bleed724 = sessions.filter((s) => s.viewport === "724" && s.visual);
  const totalBleed724 = bleed724.reduce((n, s) => n + (s.visual?.clippedBleedCount ?? 0), 0);

  const payload = {
    collectedAt: new Date().toISOString(),
    baseUrl: BASE,
    login,
    overflowPassCount: sessions.filter((s) => s.overflow.ok).length,
    overflowFailCount: overflowFails.length,
    totalSessions: sessions.length,
    bleed724Summary: {
      routes: bleed724.length,
      totalClippedBleed: totalBleed724,
      perRoute: bleed724.map((s) => ({
        route: s.route,
        ...s.visual,
      })),
    },
    sessions,
  };

  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(
    `Wrote ${OUT} overflow pass=${payload.overflowPassCount}/${payload.totalSessions} bleed724=${totalBleed724}`,
  );
  if (login.loggedIn && overflowFails.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
