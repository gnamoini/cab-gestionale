import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isStagingPublicSlice, isStagingBlockedPathname } from "@/lib/env/staging-public";
import { resolveServerAuthWithSupabase } from "@/src/lib/auth/resolve-server-auth";
import {
  CAB_AUTH_SNAPSHOT_HEADER,
  encodeServerAuthSnapshotHeader,
} from "@/src/lib/auth/proxy-auth-snapshot-header";
import type { ServerAuthSnapshot } from "@/src/lib/auth/server-auth-types";
import { createSupabaseMiddlewareClient } from "@/src/lib/supabase/middleware-client";
import {
  ACCESS_DENIED_PATH,
  CLIENTE_HOME_PATH,
  defaultHomePathForRole,
  isClienteRole,
  pathnameToPage,
} from "@/lib/auth/rbac";
import { evaluateGestionaleRouteAccess } from "@/src/lib/auth/evaluate-gestionale-route-access";
import {
  OPERATOR_GLOBAL_SETTINGS_KEY,
  OPERATOR_GLOBAL_SETTINGS_MODULE,
  parseOperatorGlobalSettingsDbEnabled,
} from "@/lib/permissions/operator-global-settings";
import { tryAuthPrecheckEdge, tryEdgeRoute } from "@/src/middleware/edge-router";
import { logBootServer } from "@/lib/observability/boot-investigation";

const LOGIN_PATH = "/login";
const RESET_PASSWORD_PATH = "/login/reset-password";
const PRIVACY_POLICY_PATH = "/privacy-policy";
const OFFLINE_PATH = "/offline";

function isPublicInfoPath(pathname: string): boolean {
  return pathname === PRIVACY_POLICY_PATH;
}

function isPwaPublicPath(pathname: string): boolean {
  return pathname === OFFLINE_PATH || isPublicInfoPath(pathname);
}

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (/\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot)$/.test(pathname)) return true;
  return false;
}

function isPwaStaticAsset(pathname: string): boolean {
  if (pathname === "/sw.js") return true;
  if (pathname === "/manifest.webmanifest") return true;
  if (pathname.startsWith("/icons/")) return true;
  return isStaticAsset(pathname);
}

/** Cron worker (Bearer CRON_SECRET / service role) — no sessione utente. */
function isCronApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/cron/");
}
function logEdgeRedirect(from: string, to: string, reason: string): void {
  logBootServer("REDIRECT", "edge", { from, to, reason }, `${from}→${to}`);
}

function redirectWithLog(request: NextRequest, pathname: string, to: URL, reason: string): NextResponse {
  logEdgeRedirect(pathname, `${to.pathname}${to.search}`, reason);
  return NextResponse.redirect(to);
}

function requestHadSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.includes("-auth-token"));
}

/** Inoltra snapshot auth edge→RSC; rimuove header client-forged. */
function forwardProxyResponse(
  request: NextRequest,
  baseResponse: NextResponse,
  auth?: ServerAuthSnapshot,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(CAB_AUTH_SNAPSHOT_HEADER);
  if (auth?.user?.id) {
    requestHeaders.set(CAB_AUTH_SNAPSHOT_HEADER, encodeServerAuthSnapshotHeader(auth));
  }
  const out = NextResponse.next({ request: { headers: requestHeaders } });
  baseResponse.cookies.getAll().forEach((cookie) => {
    out.cookies.set(cookie);
  });
  return out;
}

/**
 * Auth + RBAC edge handler (no segment config here — keep matcher in `middleware.ts` only).
 */
export async function handleProxyRequest(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const bootTiming = process.env.NEXT_PUBLIC_BOOT_TIMING === "1";
  const t0 = bootTiming ? Date.now() : 0;

  if (isPwaStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (isCronApiPath(pathname)) {
    return NextResponse.next();
  }

  if (isPwaPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const authPrecheck = tryAuthPrecheckEdge(request);
    if (authPrecheck) return authPrecheck;
  }

  const isLoginArea = pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
  if (
    !pathname.startsWith("/api/") &&
    !isLoginArea &&
    !isPublicInfoPath(pathname) &&
    !isPwaPublicPath(pathname) &&
    !requestHadSupabaseAuthCookies(request)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    const from = pathname === "/" ? "/dashboard" : `${pathname}${request.nextUrl.search}`;
    url.searchParams.set("from", from);
    return redirectWithLog(request, pathname, url, "no_auth_cookie");
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  if (!supabase) {
    if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`) || isPublicInfoPath(pathname)) {
      return forwardProxyResponse(request, response);
    }
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("from", pathname === "/" ? "/dashboard" : `${pathname}${request.nextUrl.search}`);
    return redirectWithLog(request, pathname, url, "no_supabase_client");
  }

  const auth = await resolveServerAuthWithSupabase(supabase, request.cookies.getAll());
  const activeUser = auth.user;
  const role = activeUser?.ruolo ?? null;
  const homePathOpts = { rolePageAccess: auth.rolePageAccess ?? {} };

  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    const isResetPassword = pathname === RESET_PASSWORD_PATH;
    if (activeUser && !isResetPassword) {
      const home = defaultHomePathForRole(role, homePathOpts);
      return redirectWithLog(request, pathname, new URL(home, request.url), "logged_in_on_login");
    }
    return forwardProxyResponse(request, response);
  }

  if (isPublicInfoPath(pathname)) {
    return forwardProxyResponse(request, response, auth);
  }

  if (!activeUser) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    const from = pathname === "/" ? "/dashboard" : `${pathname}${request.nextUrl.search}`;
    url.searchParams.set("from", from);
    if (requestHadSupabaseAuthCookies(request)) {
      url.searchParams.set("reason", "session_expired");
    }
    return redirectWithLog(request, pathname, url, "anonymous");
  }

  if (isStagingPublicSlice() && isStagingBlockedPathname(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set("staging_unavailable", "1");
    return redirectWithLog(request, pathname, url, "staging_blocked");
  }

  if (pathname === "/") {
    const home = defaultHomePathForRole(role, homePathOpts);
    const redirect = redirectWithLog(request, pathname, new URL(home, request.url), "root_home");
    if (bootTiming) {
      console.info(`[boot-timing] proxy GET / → ${home} ${Date.now() - t0}ms`);
    }
    return redirect;
  }

  if (isClienteRole(activeUser)) {
    const denied = !evaluateGestionaleRouteAccess({
      user: activeUser,
      userId: activeUser.id,
      pathname,
      rolePageAccess: auth.rolePageAccess ?? {},
      userPageOverrideRows: auth.userPageOverrides ?? [],
      pilotDbEnabled: false,
    });
    if (denied && pathname !== ACCESS_DENIED_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = ACCESS_DENIED_PATH;
      url.searchParams.set("from", CLIENTE_HOME_PATH);
      url.searchParams.set("denied", "cliente_route");
      return redirectWithLog(request, pathname, url, "cliente_route_denied");
    }
  }

  const page = pathnameToPage(pathname);
  let pilotDbEnabled = false;
  if (page?.key === "impostazioni") {
    const { data: pilotRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("module", OPERATOR_GLOBAL_SETTINGS_MODULE)
      .eq("key", OPERATOR_GLOBAL_SETTINGS_KEY)
      .maybeSingle();
    pilotDbEnabled = parseOperatorGlobalSettingsDbEnabled(pilotRow?.value);
  }

  if (
    page &&
    !evaluateGestionaleRouteAccess({
      user: activeUser,
      userId: activeUser.id,
      pathname,
      rolePageAccess: auth.rolePageAccess ?? {},
      userPageOverrideRows: auth.userPageOverrides ?? [],
      pilotDbEnabled,
    })
  ) {
    const url = request.nextUrl.clone();
    url.pathname = ACCESS_DENIED_PATH;
    url.searchParams.set("from", defaultHomePathForRole(role, homePathOpts));
    url.searchParams.set("denied", page.key);
    return redirectWithLog(request, pathname, url, `rbac_denied_${page.key}`);
  }

  if (bootTiming && pathname === "/dashboard") {
    console.info(`[boot-timing] proxy ${pathname} ${Date.now() - t0}ms`);
  }

  if (pathname.startsWith("/api/")) {
    const edgeResult = await tryEdgeRoute(request, response);
    if (edgeResult) return edgeResult;
  }

  return forwardProxyResponse(request, response, auth);
}
