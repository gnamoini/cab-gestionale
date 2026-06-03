import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isStagingPublicSlice, isStagingBlockedPathname } from "@/lib/env/staging-public";
import { resolveServerAuthWithSupabase } from "@/src/lib/auth/resolve-server-auth";
import { createSupabaseMiddlewareClient } from "@/src/lib/supabase/middleware-client";
import {
  CLIENT_LAVORAZIONI_SETTINGS_KEY,
  CLIENT_LAVORAZIONI_SETTINGS_MODULE,
  parseClientPortalAccess,
} from "@/lib/lavorazioni/client-portal-access";
import {
  ACCESS_DENIED_PATH,
  defaultHomePathForRole,
  hasPermission,
  pathnameToSection,
  resolveClientLavorazioniPortalAccess,
} from "@/lib/auth/rbac";
import { evaluateGestionaleRouteAccess } from "@/src/lib/auth/evaluate-gestionale-route-access";
import {
  OPERATOR_GLOBAL_SETTINGS_KEY,
  OPERATOR_GLOBAL_SETTINGS_MODULE,
  parseOperatorGlobalSettingsDbEnabled,
} from "@/lib/permissions/operator-global-settings";

const LOGIN_PATH = "/login";
const RESET_PASSWORD_PATH = "/login/reset-password";

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (/\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot)$/.test(pathname)) return true;
  return false;
}

/**
 * Auth + RBAC edge handler (no segment config here — keep matcher in `middleware.ts` only).
 */
export async function handleProxyRequest(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const bootTiming = process.env.NEXT_PUBLIC_BOOT_TIMING === "1";
  const t0 = bootTiming ? Date.now() : 0;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  if (!supabase) {
    if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("from", pathname === "/" ? "/dashboard" : `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  const auth = await resolveServerAuthWithSupabase(supabase, request.cookies.getAll());
  const activeUser = auth.user;
  const role = activeUser?.ruolo ?? null;

  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    const isResetPassword = pathname === RESET_PASSWORD_PATH;
    if (activeUser && !isResetPassword) {
      const home = defaultHomePathForRole(role);
      return NextResponse.redirect(new URL(home, request.url));
    }
    return response;
  }

  if (!activeUser) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    const from = pathname === "/" ? "/dashboard" : `${pathname}${request.nextUrl.search}`;
    url.searchParams.set("from", from);
    return NextResponse.redirect(url);
  }

  if (isStagingPublicSlice() && isStagingBlockedPathname(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set("staging_unavailable", "1");
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const home = defaultHomePathForRole(role);
    const redirect = NextResponse.redirect(new URL(home, request.url));
    if (bootTiming) {
      console.info(`[boot-timing] proxy GET / → ${home} ${Date.now() - t0}ms`);
    }
    return redirect;
  }

  let clientLavorazioniAllowed = hasPermission(role, "viewClientLavorazioni");
  if (!clientLavorazioniAllowed && pathnameToSection(pathname) === "lavorazioni_clienti") {
    const { data: row } = await supabase
      .from("app_settings")
      .select("value")
      .eq("module", CLIENT_LAVORAZIONI_SETTINGS_MODULE)
      .eq("key", CLIENT_LAVORAZIONI_SETTINGS_KEY)
      .maybeSingle();
    const settings = parseClientPortalAccess(row?.value);
    clientLavorazioniAllowed = resolveClientLavorazioniPortalAccess(role, activeUser.id, settings.enabledUserIds);
  }

  const section = pathnameToSection(pathname);
  let pilotDbEnabled = false;
  if (section === "impostazioni") {
    const { data: pilotRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("module", OPERATOR_GLOBAL_SETTINGS_MODULE)
      .eq("key", OPERATOR_GLOBAL_SETTINGS_KEY)
      .maybeSingle();
    pilotDbEnabled = parseOperatorGlobalSettingsDbEnabled(pilotRow?.value);
  }

  if (
    section &&
    !evaluateGestionaleRouteAccess({
      user: activeUser,
      userId: activeUser.id,
      pathname,
      permissionRows: auth.permissions ?? [],
      pilotDbEnabled,
      clientLavorazioniAllowed,
    })
  ) {
    const url = request.nextUrl.clone();
    url.pathname = ACCESS_DENIED_PATH;
    url.searchParams.set("from", defaultHomePathForRole(role));
    url.searchParams.set("denied", section);
    return NextResponse.redirect(url);
  }

  if (bootTiming && pathname === "/dashboard") {
    console.info(`[boot-timing] proxy ${pathname} ${Date.now() - t0}ms`);
  }

  return response;
}
