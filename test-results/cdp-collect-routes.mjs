import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const EVAL = fs.readFileSync(path.join(ROOT, "test-results/overflow-runtime-probe-eval.txt"), "utf8");
const OUT = path.join(ROOT, "test-results/overflow-runtime-final.json");
const ROUTES = process.argv.slice(2);
const VIEWPORT = { width: 724, height: 900 };

if (ROUTES.length === 0) {
  console.error("Usage: node cdp-collect-routes.mjs /dashboard /lavorazioni ...");
  process.exit(1);
}

async function main() {
  const browser = await chromium.connectOverCDP(process.env.CDP_URL || "http://127.0.0.1:9222");
  const contexts = browser.contexts();
  const page = contexts[0]?.pages()[0];
  if (!page) throw new Error("No page in CDP browser");

  let payload = fs.existsSync(OUT)
    ? JSON.parse(fs.readFileSync(OUT, "utf8"))
    : {
        collectedAt: new Date().toISOString(),
        baseUrl: "http://localhost:3000",
        viewport: VIEWPORT,
        login: { loggedIn: true, reason: "cdp_connect" },
        sessions: [],
      };

  for (const route of ROUTES) {
    process.stdout.write(`cdp probe ${route}...\n`);
    await page.setViewportSize(VIEWPORT);
    await page.goto(`http://localhost:3000${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForSelector(".cab-app-shell", { timeout: 60_000 }).catch(() => null);
    const session = await page.evaluate(EVAL);
    payload.sessions = payload.sessions.filter((s) => s.route !== route);
    payload.sessions.push({ route, viewport: "724", viewportWidth: 724, url: page.url(), session });
    payload.sessionCount = payload.sessions.length;
    payload.collectedAt = new Date().toISOString();
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  }

  await browser.close();
  console.log(`Updated ${OUT} (${payload.sessions.length} sessions)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
