/**
 * One-off route console audit — service-role magic link login when SMOKE_ADMIN_* absent.
 * Usage: npx tsx scripts/bench/route-console-audit.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { ensureBenchLoggedIn } from "./benchmark-auth";

const BASE_URL = process.env.SMOKE_BASE_URL?.trim() ?? "http://localhost:3000";

const MAIN_ROUTES = [
  "/dashboard",
  "/agenda",
  "/lavorazioni",
  "/lavorazioni-clienti",
  "/preventivi",
  "/ordini-fornitori",
  "/fatturazione",
  "/documenti",
  "/magazzino",
  "/magazzino/carichi",
  "/identifica-ricambio",
  "/mezzi",
  "/dipendenti",
  "/report",
  "/impostazioni",
  "/sicurezza",
] as const;

const REPORT_SUB_ROUTES = ["/report/ai", "/report/lavorazioni", "/report/magazzino"] as const;

const IGNORE_CONSOLE = [/favicon/i, /failed to load resource.*404/i, /devtools/i];
const IGNORE_PAGEERROR = [
  /supabase\.co\/auth\/v1\/user due to access control checks/i,
  /due to access control checks\.?$/i,
  /ResizeObserver loop completed with undelivered notifications/i,
];

function loadEnvLocal(): void {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

type RouteResult = {
  route: string;
  status: "OK" | "ERROR";
  httpStatus: number | null;
  errors: string[];
  reactError: boolean;
};

async function auditRoute(page: Page, route: string): Promise<RouteResult> {
  const errors: string[] = [];
  const seen = new Set<string>();

  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORE_CONSOLE.some((re) => re.test(text))) return;
    if (seen.has(text)) return;
    seen.add(text);
    errors.push(`console.error: ${text}`);
  };

  const onRequestFailed = (request: { url: () => string; failure: () => { errorText: string } | null }) => {
    const failure = request.failure()?.errorText ?? "";
    if (failure.includes("ERR_ABORTED")) return;
    const url = request.url();
    if (!url.includes("localhost:3000") && !url.includes("127.0.0.1:3000")) return;
    const line = `requestfailed: ${failure} ${url}`;
    if (seen.has(line)) return;
    seen.add(line);
    errors.push(line);
  };

  const onResponse = (response: { url: () => string; status: () => number; request: () => { resourceType: () => string } }) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    if (!url.includes("localhost:3000") && !url.includes("127.0.0.1:3000")) return;
    if (url.includes("/_next/")) return;
    const line = `http ${status}: ${url}`;
    if (seen.has(line)) return;
    seen.add(line);
    errors.push(line);
  };

  const onPageError = (err: Error) => {
    const message = err.message;
    if (IGNORE_PAGEERROR.some((re) => re.test(message))) return;
    if (seen.has(message)) return;
    seen.add(message);
    errors.push(`pageerror: ${message}`);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  let httpStatus: number | null = null;
  try {
    const response = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
    httpStatus = response?.status() ?? null;
    await page.waitForTimeout(3500);
    await page.locator(".cab-app-shell, main").first().waitFor({ state: "visible", timeout: 45_000 }).catch(() => {});
  } catch (err) {
    errors.push(`navigation: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);
  }

  const bodyText = await page.locator("body").innerText().catch(() => "");
  const reactError =
    /Minified React error/i.test(bodyText) ||
    /hydration failed/i.test(bodyText) ||
    /Maximum update depth exceeded/i.test(bodyText) ||
    errors.some((e) => /react error|hydration|update depth|useSyncExternalStore/i.test(e));

  if (reactError) {
    errors.push("react-runtime: detected React/hydration/infinite-loop signature in page");
  }

  return {
    route,
    status: errors.length === 0 ? "OK" : "ERROR",
    httpStatus,
    errors,
    reactError,
  };
}

async function main(): Promise<void> {
  loadEnvLocal();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const loginMode = await ensureBenchLoggedIn(page, context, BASE_URL);
  console.log(`login: ${loginMode}`);

  const results: RouteResult[] = [];
  for (const route of [...MAIN_ROUTES, ...REPORT_SUB_ROUTES]) {
    const result = await auditRoute(page, route);
    results.push(result);
    console.log(`${result.status === "OK" ? "OK" : "ERR"} ${route}${result.errors.length ? ` — ${result.errors[0]}` : ""}`);
  }

  await browser.close();

  const summary = {
    baseUrl: BASE_URL,
    loginMode,
    checked: results.length,
    ok: results.filter((r) => r.status === "OK").length,
    errors: results.filter((r) => r.status === "ERROR"),
  };

  const outPath = path.join(process.cwd(), "test-results", "route-console-audit.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ summary, results }, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`OK ${summary.ok}/${summary.checked}`);

  if (summary.errors.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
