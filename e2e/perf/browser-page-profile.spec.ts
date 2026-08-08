/**
 * Browser perf audit — TTFB, resource timing, JSON parse proxy.
 * Run: PERF_USE_DEV=1 npx playwright test -c e2e/perf/playwright.config.ts
 * Requires SMOKE_ADMIN_EMAIL/PASSWORD (and optionally OPERATOR) in .env.local
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { adminCredentials, loginViaUi, operatorCredentials } from "../fixtures/auth";

type RouteSpec = {
  path: string;
  readySelector: string;
  readyKind: "heading" | "text";
};

const ROUTES: RouteSpec[] = [
  { path: "/dashboard", readySelector: "Dashboard", readyKind: "heading" },
  { path: "/lavorazioni", readySelector: "Lavorazioni in corso", readyKind: "text" },
  { path: "/mezzi", readySelector: "Mezzi", readyKind: "heading" },
  { path: "/magazzino", readySelector: "Magazzino", readyKind: "heading" },
  { path: "/report", readySelector: "Report", readyKind: "heading" },
];

type PerfSnapshot = {
  role: string;
  route: string;
  mode: "cold" | "warm";
  navigationMs: number | null;
  domContentLoadedMs: number | null;
  loadEventMs: number | null;
  restResources: Array<{
    name: string;
    durationMs: number;
    transferSize: number;
    encodedBodySize: number;
    responseStartMs: number;
    ttfbMs: number;
  }>;
  parseBenchMs: number | null;
  interactiveMs: number | null;
};

async function collectPerf(page: import("@playwright/test").Page): Promise<Omit<PerfSnapshot, "role" | "route" | "mode">> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const resources = performance
      .getEntriesByType("resource")
      .filter((r) => r.name.includes("/rest/v1/"))
      .map((r) => {
        const rt = r as PerformanceResourceTiming;
        return {
          name: rt.name.split("/rest/v1/")[1]?.split("?")[0] ?? rt.name,
          durationMs: Math.round(rt.duration),
          transferSize: rt.transferSize,
          encodedBodySize: rt.encodedBodySize,
          responseStartMs: Math.round(rt.responseStart),
          ttfbMs: Math.round(rt.responseStart - rt.requestStart),
        };
      });

    let parseBenchMs: number | null = null;
    const sample = localStorage.getItem("__perf_parse_sample");
    if (sample) {
      const t0 = performance.now();
      JSON.parse(sample);
      parseBenchMs = Math.round(performance.now() - t0);
    }

    return {
      navigationMs: nav ? Math.round(nav.duration) : null,
      domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
      loadEventMs: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
      restResources: resources,
      parseBenchMs,
      interactiveMs: nav ? Math.round(nav.domInteractive - nav.startTime) : null,
    };
  });
}

async function waitRouteReady(page: import("@playwright/test").Page, spec: RouteSpec) {
  if (spec.readyKind === "heading") {
    await expect(page.getByRole("heading", { name: spec.readySelector })).toBeVisible({ timeout: 60_000 });
  } else {
    await expect(page.getByText(spec.readySelector, { exact: false }).first()).toBeVisible({ timeout: 60_000 });
  }
  const spinners = page.locator('[class*="cab-spinner-ring"]');
  if ((await spinners.count()) > 0) {
    await expect(spinners.first()).not.toBeVisible({ timeout: 60_000 });
  }
}

// Per-route cold/warm profiling
for (const roleSpec of [
  { role: "admin", creds: () => adminCredentials() },
  { role: "operatore", creds: () => operatorCredentials() },
] as const) {
  test(`${roleSpec.role} page profile cold/warm`, async ({ browser }) => {
    const creds = roleSpec.creds();
    if (!creds) {
      test.skip();
      return;
    }

    const snapshots: PerfSnapshot[] = [];

    for (const spec of ROUTES) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginViaUi(page, creds);

      await page.goto(spec.path, { waitUntil: "domcontentloaded" });
      await waitRouteReady(page, spec);
      snapshots.push({ role: roleSpec.role, route: spec.path, mode: "cold", ...(await collectPerf(page)) });

      await page.goto(spec.path, { waitUntil: "domcontentloaded" });
      await waitRouteReady(page, spec);
      snapshots.push({ role: roleSpec.role, route: spec.path, mode: "warm", ...(await collectPerf(page)) });

      await context.close();
    }

    mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
    const outPath = join(process.cwd(), "test-results", `perf-audit-${roleSpec.role}.json`);
    writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), snapshots }, null, 2));

    const playwrightDir = join(process.cwd(), "e2e", "test-results", "perf-playwright");
    mkdirSync(playwrightDir, { recursive: true });
    const legacyName = roleSpec.role === "admin" ? "perf-snapshot-admin.json" : "perf-snapshot.json";
    writeFileSync(
      join(playwrightDir, legacyName),
      JSON.stringify({ generatedAt: new Date().toISOString(), snapshots }, null, 2),
    );

    expect(snapshots.length).toBe(ROUTES.length * 2);
  });
}

test.describe("stress weak hardware proxy", () => {
  test("throttled cold navigation", async ({ browser }) => {
    const creds = adminCredentials();
    if (!creds) {
      test.skip();
      return;
    }

    const context = await browser.newContext({
      // ponytail: Playwright CPU/network throttle proxies weak hardware — not literal Win7/HDD
    });
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await client.send("Network.enable");
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: (500 * 1024) / 8,
      uploadThroughput: (500 * 1024) / 8,
      latency: 400,
    });

    await loginViaUi(page, creds);
    const spec = ROUTES[1];
    await page.goto(spec.path, { waitUntil: "domcontentloaded" });
    await waitRouteReady(page, spec);
    const snap = { role: "admin", route: spec.path, mode: "stress", ...(await collectPerf(page)) };

    const outDir = join(process.cwd(), "e2e", "test-results", "perf-playwright");
    mkdirSync(outDir, { recursive: true });
    const stressPath = join(outDir, "perf-stress-snapshot.json");
    writeFileSync(stressPath, JSON.stringify({ generatedAt: new Date().toISOString(), snap }, null, 2));
    expect(snap.interactiveMs ?? snap.navigationMs ?? 0).toBeGreaterThan(0);

    await context.close();
  });
});
