/**
 * Skeleton runtime benchmark — TTUI, blankDurationMs, hard/soft navigation.
 * Requires: dev server + SMOKE_ADMIN_EMAIL/PASSWORD in env.
 *
 * Usage:
 *   npm run dev
 *   npx tsx scripts/bench/skeleton-runtime-benchmark.ts --base-url=http://localhost:3000
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { chromium, type BrowserContext, type Page } from "playwright";
import {
  buildBenchmarkEnvironment,
  parseBenchCliArgs,
  readCliArgValue,
  type BenchmarkEnvironment,
} from "./benchmark-environment";

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
const TRANSITION_LOADER = '[data-testid="page-transition-loader"]';
const MAX_BLANK_MS = 500;
const MAX_LAYOUT_SHIFT_PX = 48;

type RouteSpec = {
  route: string;
  maxDomNodes: number;
  maxPulseCount: number;
  /** Soft nav: partenza e voce sidebar */
  softFrom?: string;
  softNavLabel?: string;
};

const ROUTES: RouteSpec[] = [
  { route: "/dashboard", maxDomNodes: 80, maxPulseCount: 8 },
  {
    route: "/magazzino",
    maxDomNodes: 50,
    maxPulseCount: 6,
    softFrom: "/dashboard",
    softNavLabel: "Magazzino",
  },
  {
    route: "/lavorazioni",
    maxDomNodes: 60,
    maxPulseCount: 6,
    softFrom: "/dashboard",
    softNavLabel: "Lavorazioni",
  },
  {
    route: "/lavorazioni-clienti",
    maxDomNodes: 55,
    maxPulseCount: 6,
    softFrom: "/dashboard",
    softNavLabel: "Portale Clienti",
  },
  { route: "/report", maxDomNodes: 80, maxPulseCount: 10 },
];

const DEFAULT_BENCH_ROUTES = ROUTES.filter((r) => r.route !== "/report");

type BenchResult = {
  route: string;
  navMode: "hard" | "soft";
  loadingDomNodes: number;
  pulseCount: number;
  skeletonMountCount: number;
  ttuiMs: number;
  blankDurationMs: number;
  hydrationMs: number | null;
  loadingVisibleMs: number | null;
  loadingGoneMs: number | null;
  clientChunkWaitMs: number | null;
  transitionLoaderMs: number | null;
  blankAfterLoadingMs: number;
  interactiveMs: number;
  skeletonToInteractiveMs: number | null;
  transitionLayoutShiftPx: number | null;
  cls: number | null;
};

type BenchSnapshot = {
  environment: BenchmarkEnvironment;
  baseUrl: string;
  measuredAt: string;
  authMethod?: "smoke-password" | "service-role-magiclink";
  throttled?: boolean;
  hard: BenchResult[];
  soft: BenchResult[];
  failures: string[];
  skipped?: string;
};

function credentials(): { email: string; password: string } | null {
  const email = process.env.SMOKE_ADMIN_EMAIL?.trim();
  const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

async function resolveAdminEmailViaServiceRole(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id")
    .eq("role_key", "admin")
    .limit(1);
  if (error || !profiles?.[0]?.id) return null;

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(profiles[0].id);
  if (userErr) return null;
  return userData.user?.email?.trim() ?? null;
}

async function loginViaUi(page: Page, baseUrl: string, email: string, password: string): Promise<void> {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("smoke-login-identifier").fill(email);
  await page.getByTestId("smoke-login-password").fill(password);
  await page.getByTestId("smoke-login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
}

async function applySessionCookies(
  context: BrowserContext,
  baseUrl: string,
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new Error("Supabase public env missing");

  const cookiesToSet: { name: string; value: string; options?: CookieOptions }[] = [];
  const serverClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookies: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.push(...cookies);
      },
    },
  });

  const { error } = await serverClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw new Error(`setSession: ${error.message}`);

  const { hostname } = new URL(baseUrl);
  await context.addCookies(
    cookiesToSet.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: hostname,
      path: cookie.options?.path ?? "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
  );
}

async function loginViaServiceRoleMagicLink(
  context: BrowserContext,
  page: Page,
  baseUrl: string,
  email: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Supabase env required for service-role login fallback");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw new Error(`generateLink: ${error.message}`);
  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) throw new Error("generateLink: missing hashed_token");

  const { data: verified, error: otpErr } = await anon.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (otpErr) throw new Error(`verifyOtp: ${otpErr.message}`);
  const session = verified.session;
  if (!session?.access_token || !session.refresh_token) {
    throw new Error("verifyOtp: missing session tokens");
  }

  await applySessionCookies(context, baseUrl, session.access_token, session.refresh_token);
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "commit", timeout: 90_000 });
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
}

async function ensureLoggedIn(
  page: Page,
  context: BrowserContext,
  baseUrl: string,
): Promise<"smoke-password" | "service-role-magiclink"> {
  const creds = credentials();
  if (creds) {
    await loginViaUi(page, baseUrl, creds.email, creds.password);
    return "smoke-password";
  }

  const adminEmail = await resolveAdminEmailViaServiceRole();
  if (!adminEmail) {
    throw new Error(
      "SMOKE_ADMIN_EMAIL/PASSWORD or SUPABASE_SERVICE_ROLE_KEY + admin profile required",
    );
  }
  await loginViaServiceRoleMagicLink(context, page, baseUrl, adminEmail);
  return "service-role-magiclink";
}

async function waitForPageReady(
  page: Page,
  startMs: number,
  timeoutMs = 30_000,
): Promise<Omit<BenchResult, "route" | "navMode">> {
  const deadline = Date.now() + timeoutMs;
  let skeletonPhases = 0;
  let wasBusy = false;
  let maxDomDuringLoad = 0;
  let maxPulseDuringLoad = 0;

  let loadingVisibleAt: number | null = null;
  let loadingGoneAt: number | null = null;
  let transitionStartAt: number | null = null;
  let transitionEndAt: number | null = null;
  let loaderMainHeight: number | null = null;
  let interactiveMainHeight: number | null = null;
  let blankAccumMs = 0;
  let blankAfterLoadingAccumMs = 0;
  let lastTick = startMs;
  let clientChunkWaitMs: number | null = null;
  let chunkWaitStart: number | null = null;

  while (Date.now() < deadline) {
    const now = Date.now();
    const state = await page.evaluate(
      ({ toolbarSel, loaderSel }) => {
        const main = document.querySelector("main");
        const hasToolbar = !!document.querySelector(toolbarSel);
        const hasLoader = !!document.querySelector(loaderSel);
        const busyEls = main?.querySelectorAll('[aria-busy="true"]').length ?? 0;
        const pulse = document.querySelectorAll(".animate-pulse, .motion-safe\\:animate-pulse").length;
        const domNodes = main ? main.querySelectorAll("*").length : 0;
        const mainHeight = main ? main.getBoundingClientRect().height : 0;
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        return {
          hasToolbar,
          hasLoader,
          busyEls,
          pulse,
          domNodes,
          mainHeight,
          hydrationMs: nav ? Math.round(nav.domContentLoadedEventEnd - nav.responseEnd) : null,
        };
      },
      { toolbarSel: PAGE_READY, loaderSel: TRANSITION_LOADER },
    );

    const hasRouteSkeleton = state.busyEls > 0 || (state.pulse > 0 && !state.hasLoader);
    const hasCoverage = hasRouteSkeleton || state.hasLoader || state.hasToolbar;
    const tickDelta = now - lastTick;

    if (loadingVisibleAt === null && hasRouteSkeleton) {
      loadingVisibleAt = now;
    }
    if (loadingVisibleAt != null && loadingGoneAt === null && !hasRouteSkeleton) {
      loadingGoneAt = now;
      chunkWaitStart = now;
    }
    if (loadingVisibleAt === null && loadingGoneAt === null && state.hasLoader) {
      loadingGoneAt = now;
      chunkWaitStart = now;
    }

    if (chunkWaitStart != null && clientChunkWaitMs === null) {
      if (state.hasLoader || state.hasToolbar) {
        clientChunkWaitMs = now - chunkWaitStart;
      }
    }

    if (state.hasLoader) {
      if (transitionStartAt === null) transitionStartAt = now;
      loaderMainHeight = state.mainHeight;
    } else if (transitionStartAt != null && transitionEndAt === null) {
      transitionEndAt = now;
    }

    if (!state.hasToolbar) {
      maxDomDuringLoad = Math.max(maxDomDuringLoad, state.domNodes);
      maxPulseDuringLoad = Math.max(maxPulseDuringLoad, state.pulse);
      if (hasRouteSkeleton && !wasBusy) {
        skeletonPhases += 1;
        wasBusy = true;
      }
      if (!hasRouteSkeleton) wasBusy = false;
    }

    if (!hasCoverage) {
      blankAccumMs += tickDelta;
    }

    const isPostLoading = loadingGoneAt != null;
    if (isPostLoading && !hasRouteSkeleton && !state.hasLoader && !state.hasToolbar) {
      blankAfterLoadingAccumMs += tickDelta;
    }
    lastTick = now;

    if (state.hasToolbar) {
      interactiveMainHeight = state.mainHeight;
      const interactiveMs = now - startMs;
      const loadingVisibleMs =
        loadingVisibleAt != null ? loadingVisibleAt - startMs : null;
      const loadingGoneMs = loadingGoneAt != null ? loadingGoneAt - startMs : null;
      const transitionLoaderMs =
        transitionStartAt != null
          ? (transitionEndAt ?? now) - transitionStartAt
          : null;
      const skeletonToInteractiveMs =
        loadingVisibleAt != null ? now - loadingVisibleAt : null;
      const transitionLayoutShiftPx =
        loaderMainHeight != null && interactiveMainHeight != null
          ? Math.round(Math.abs(interactiveMainHeight - loaderMainHeight))
          : null;

      return {
        loadingDomNodes: maxDomDuringLoad,
        pulseCount: maxPulseDuringLoad,
        skeletonMountCount: Math.max(skeletonPhases, state.busyEls > 0 ? 1 : 0),
        ttuiMs: interactiveMs,
        blankDurationMs: blankAccumMs,
        hydrationMs: state.hydrationMs,
        loadingVisibleMs,
        loadingGoneMs,
        clientChunkWaitMs,
        transitionLoaderMs,
        blankAfterLoadingMs: blankAfterLoadingAccumMs,
        interactiveMs,
        skeletonToInteractiveMs,
        transitionLayoutShiftPx,
        cls: null,
      };
    }

    await page.waitForTimeout(16);
  }

  throw new Error(`Timeout waiting for ${PAGE_READY}`);
}

async function measureCls(page: Page): Promise<number> {
  return page.evaluate(() => {
    const entries = performance.getEntriesByType("layout-shift") as unknown as Array<{
      value: number;
      hadRecentInput?: boolean;
    }>;
    let cls = 0;
    for (const e of entries) {
      if (!e.hadRecentInput) cls += e.value;
    }
    return Math.round(cls * 1000) / 1000;
  });
}

async function applyDevThrottle(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (480 * 1024) / 8,
    uploadThroughput: (480 * 1024) / 8,
    connectionType: "cellular3g",
  });
}

async function benchHard(page: Page, baseUrl: string, spec: RouteSpec): Promise<BenchResult> {
  const startMs = Date.now();
  await page.goto(`${baseUrl}${spec.route}?_bench=${startMs}`, { waitUntil: "commit", timeout: 90_000 });
  const metrics = await waitForPageReady(page, startMs);
  const cls = await measureCls(page);
  return { route: spec.route, navMode: "hard", ...metrics, cls };
}

async function benchSoft(page: Page, baseUrl: string, spec: RouteSpec): Promise<BenchResult> {
  if (!spec.softFrom || !spec.softNavLabel) {
    throw new Error(`Soft nav not configured for ${spec.route}`);
  }
  await page.goto(`${baseUrl}${spec.softFrom}`, { waitUntil: "commit", timeout: 90_000 });
  await page.locator(PAGE_READY).first().waitFor({ timeout: 60_000 });

  const startMs = Date.now();
  const navLink = page.locator(`a[href="${spec.route}"]`).first();
  await navLink.waitFor({ state: "visible", timeout: 30_000 });
  await navLink.click();
  await page.locator(PAGE_READY).first().waitFor({ timeout: 60_000 });
  const metrics = await waitForPageReady(page, startMs);
  const cls = await measureCls(page);
  return { route: spec.route, navMode: "soft", ...metrics, cls };
}

function evaluateFailures(
  results: BenchResult[],
  specs: RouteSpec[],
  throttled: boolean,
): string[] {
  const failures: string[] = [];
  const specByRoute = new Map(specs.map((s) => [s.route, s]));

  for (const r of results) {
    const spec = specByRoute.get(r.route);
    if (!spec) continue;
    if (r.loadingDomNodes > spec.maxDomNodes) {
      failures.push(`${r.route} (${r.navMode}): DOM ${r.loadingDomNodes} > ${spec.maxDomNodes}`);
    }
    if (r.pulseCount > spec.maxPulseCount) {
      failures.push(`${r.route} (${r.navMode}): pulse ${r.pulseCount} > ${spec.maxPulseCount}`);
    }
    if (!throttled && r.blankAfterLoadingMs > MAX_BLANK_MS) {
      failures.push(
        `${r.route} (${r.navMode}): blankAfterLoadingMs ${r.blankAfterLoadingMs} > ${MAX_BLANK_MS}`,
      );
    }
    if (
      r.transitionLayoutShiftPx != null &&
      r.transitionLayoutShiftPx > MAX_LAYOUT_SHIFT_PX
    ) {
      failures.push(
        `${r.route} (${r.navMode}): transitionLayoutShiftPx ${r.transitionLayoutShiftPx} > ${MAX_LAYOUT_SHIFT_PX}`,
      );
    }
    if (r.skeletonMountCount > 1) {
      failures.push(
        `${r.route} (${r.navMode}): skeletonMountCount ${r.skeletonMountCount} > 1`,
      );
    }
    if (r.cls != null && r.cls > 0.1) {
      failures.push(`${r.route} (${r.navMode}): CLS ${r.cls} > 0.1`);
    }
  }
  return failures;
}

async function main(): Promise<void> {
  const benchCli = parseBenchCliArgs(process.argv);
  const baseUrl = readCliArgValue(process.argv, "--base-url=") ?? "http://localhost:3000";
  const throttled = process.argv.includes("--throttle");
  const routeFilter = readCliArgValue(process.argv, "--routes=");
  const selectedRoutes = routeFilter
    ? ROUTES.filter((r) => routeFilter.split(",").includes(r.route))
    : throttled
      ? ROUTES.filter((r) => ["/dashboard", "/lavorazioni", "/report"].includes(r.route))
      : DEFAULT_BENCH_ROUTES;
  const outPath =
    readCliArgValue(process.argv, "--out=") ??
    join(
      process.cwd(),
      "test-results",
      throttled
        ? "skeleton-benchmark-throttled.json"
        : "skeleton-benchmark-transition-loader.json",
    );

  const environment = buildBenchmarkEnvironment({
    nextMode: benchCli.nextMode,
    dataset: benchCli.dataset,
  });

  const snapshot: BenchSnapshot = {
    environment,
    baseUrl,
    measuredAt: environment.timestamp,
    throttled,
    hard: [],
    soft: [],
    failures: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    snapshot.authMethod = await ensureLoggedIn(page, context, baseUrl);
    if (throttled) {
      await applyDevThrottle(page);
    }

    for (const spec of selectedRoutes) {
      try {
        snapshot.hard.push(await benchHard(page, baseUrl, spec));
      } catch (err) {
        snapshot.failures.push(
          `hard ${spec.route}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      if (!throttled && spec.softFrom && spec.softNavLabel) {
        try {
          snapshot.soft.push(await benchSoft(page, baseUrl, spec));
        } catch (err) {
          snapshot.failures.push(
            `soft ${spec.route}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  } catch (err) {
    snapshot.failures.push(err instanceof Error ? err.message : String(err));
  } finally {
    await browser.close();
  }

  snapshot.failures.push(
    ...evaluateFailures([...snapshot.hard, ...snapshot.soft], selectedRoutes, throttled),
  );

  mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify(snapshot, null, 2));

  if (snapshot.failures.length > 0) {
    console.error("skeleton-runtime-benchmark: FAIL");
    for (const f of snapshot.failures) console.error(`  - ${f}`);
    process.exitCode = 1;
    return;
  }

  console.log("skeleton-runtime-benchmark: OK");
}

void main();
