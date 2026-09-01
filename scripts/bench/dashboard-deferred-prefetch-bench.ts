/**
 * Misura Health Score API e (opzionale) navigazione dashboard via HTTP autenticato.
 *
 * Usage (dev server required for HTTP paths):
 *   npm run dev
 *   npx tsx scripts/bench/dashboard-deferred-prefetch-bench.ts --base-url=http://localhost:3000
 *   npx tsx scripts/bench/dashboard-deferred-prefetch-bench.ts --out=test-results/dashboard-deferred-prefetch-before.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { ensureBenchLoggedIn } from "./benchmark-auth";
import { buildBenchmarkEnvironment, parseBenchCliArgs, readCliArgValue } from "./benchmark-environment";

function loadEnvFile(rel: string): void {
  const p = join(process.cwd(), rel);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
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

const PAGE_READY = '[data-testid="page-ready-toolbar"]';

type BenchSnapshot = {
  measuredAt: string;
  environment: ReturnType<typeof buildBenchmarkEnvironment>;
  baseUrl: string;
  healthScoreApiMs: number | null;
  healthScoreApiStatus: number | null;
  healthScorePayloadStatus: string | null;
  dashboardInteractiveMs: number | null;
  skipped?: string;
  note: string;
};

async function main(): Promise<void> {
  const benchCli = parseBenchCliArgs(process.argv);
  const baseUrl = readCliArgValue(process.argv, "--base-url=") ?? "http://localhost:3000";
  const outPath =
    readCliArgValue(process.argv, "--out=") ??
    join(process.cwd(), "test-results", "dashboard-deferred-prefetch-bench.json");

  const snapshot: BenchSnapshot = {
    measuredAt: new Date().toISOString(),
    environment: buildBenchmarkEnvironment({
      nextMode: benchCli.nextMode,
      dataset: benchCli.dataset,
    }),
    baseUrl,
    healthScoreApiMs: null,
    healthScoreApiStatus: null,
    healthScorePayloadStatus: null,
    dashboardInteractiveMs: null,
    note:
      "SSR bffMs/healthScoreMs: avviare dev con DASHBOARD_DEFERRED_TIMING=1 e caricare /dashboard — log server [dashboard-deferred].",
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await ensureBenchLoggedIn(page, context, baseUrl);

    const hsStart = Date.now();
    const hsRes = await page.request.get(`${baseUrl}/api/dashboard/health-score`);
    snapshot.healthScoreApiMs = Date.now() - hsStart;
    snapshot.healthScoreApiStatus = hsRes.status();
    if (hsRes.ok()) {
      const body = (await hsRes.json()) as { status?: string };
      snapshot.healthScorePayloadStatus = body.status ?? null;
    }

    const dashStart = Date.now();
    await page.goto(`${baseUrl}/dashboard?_bench=${dashStart}`, {
      waitUntil: "commit",
      timeout: 90_000,
    });
    await page.locator(PAGE_READY).first().waitFor({ timeout: 60_000 });
    snapshot.dashboardInteractiveMs = Date.now() - dashStart;
  } catch (err) {
    snapshot.skipped = err instanceof Error ? err.message : String(err);
  } finally {
    await browser.close();
  }

  mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify(snapshot, null, 2));

  if (snapshot.skipped) {
    console.error("dashboard-deferred-prefetch-bench: partial (see skipped)");
    process.exitCode = 1;
  }
}

void main();
