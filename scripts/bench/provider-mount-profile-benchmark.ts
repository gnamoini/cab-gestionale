/**
 * Provider mount profile — collects performance.measure from provider:* marks.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { ensureBenchLoggedIn } from "./benchmark-auth";
import { buildBenchmarkEnvironment, readCliArgValue } from "./benchmark-environment";

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

const DEFAULT_OUT = join(process.cwd(), "test-results", "provider-mount-profile-sprint26.json");
const CRITICAL_OUT = join(process.cwd(), "test-results", "critical-provider-baseline-sprint26.json");

/** Client providers on critical path before page-ready-toolbar (excludes lazy/diagnostics). */
const CRITICAL_PROVIDER_IDS = [
  "AppProvidersGestionale",
  "AppSettingsQueryProvider",
  "RealtimeStatusProvider",
  "ObservabilityProviderLite",
  "BrandingProvider",
];

async function main(): Promise<void> {
  const baseUrl = readCliArgValue(process.argv, "--base-url=") ?? "http://localhost:3001";
  const outPath = readCliArgValue(process.argv, "--out=") ?? DEFAULT_OUT;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await ensureBenchLoggedIn(page, context, baseUrl);
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "commit", timeout: 90_000 });
  await page.waitForSelector('[data-testid="page-ready-toolbar"]', { timeout: 60_000 }).catch(() => null);

  const profile = await page.evaluate(() => {
    const w = window as Window & {
      __GESTIONALE_PROVIDER_MOUNT_PROFILE__?: { provider: string; mountMs: number }[];
    };
    const measures: { provider: string; mountMs: number }[] = [];
    for (const entry of performance.getEntriesByType("measure")) {
      const m = /^provider:(.+)$/.exec(entry.name);
      if (m) measures.push({ provider: m[1], mountMs: Math.round(entry.duration * 10) / 10 });
    }
    return w.__GESTIONALE_PROVIDER_MOUNT_PROFILE__ ?? measures;
  });

  const criticalProviders = profile.filter((p) => CRITICAL_PROVIDER_IDS.includes(p.provider));
  const criticalProviderCount = criticalProviders.length;

  const report = {
    environment: buildBenchmarkEnvironment({ nextMode: "production" }),
    generatedAt: new Date().toISOString(),
    baseUrl,
    criticalProviderCountDefinition:
      "Client Component providers mounted before page-ready-toolbar; excludes lazy boundaries",
    criticalProviderCount,
    criticalProviderIds: CRITICAL_PROVIDER_IDS,
    providers: profile.map((p) => ({
      ...p,
      criticalPath: CRITICAL_PROVIDER_IDS.includes(p.provider),
      decision: CRITICAL_PROVIDER_IDS.includes(p.provider) ? "keep" : "candidate",
    })),
  };

  mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  writeFileSync(CRITICAL_OUT, JSON.stringify({ ...report, snapshot: "baseline" }, null, 2));
  console.log(`provider-mount-profile: wrote ${outPath} criticalCount=${criticalProviderCount}`);
  await browser.close();
}

void main();
