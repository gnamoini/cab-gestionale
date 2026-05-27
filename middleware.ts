import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isStagingPublicSlice, isStagingBlockedPathname } from "@/lib/env/staging-public";
import { createSupabaseMiddlewareClient } from "@/src/lib/supabase/middleware-client";
import {
  CLIENT_LAVORAZIONI_SETTINGS_KEY,
  CLIENT_LAVORAZIONI_SETTINGS_MODULE,
  parseClientPortalAccess,
} from "@/lib/lavorazioni/client-portal-access";
import {
  ACCESS_DENIED_PATH,
  canAccessPage,
  defaultHomePathForRole,
  hasPermission,
  pathnameToSection,
  resolveClientLavorazioniPortalAccess,
} from "@/lib/auth/rbac";

const LOGIN_PATH = "/login";

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (/\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot)$/.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("ruolo").eq("id", user.id).maybeSingle();
      const home = defaultHomePathForRole(prof?.ruolo ?? null);
      return NextResponse.redirect(new URL(home, request.url));
    }
    return response;
  }

  if (!user) {
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

  const { data: prof } = await supabase.from("profiles").select("ruolo").eq("id", user.id).maybeSingle();
  const role = prof?.ruolo ?? null;

  let clientLavorazioniAllowed = hasPermission(role, "viewClientLavorazioni");
  if (!clientLavorazioniAllowed && pathnameToSection(pathname) === "lavorazioni_clienti") {
    const { data: row } = await supabase
      .from("app_settings")
      .select("value")
      .eq("module", CLIENT_LAVORAZIONI_SETTINGS_MODULE)
      .eq("key", CLIENT_LAVORAZIONI_SETTINGS_KEY)
      .maybeSingle();
    const settings = parseClientPortalAccess(row?.value);
    clientLavorazioniAllowed = resolveClientLavorazioniPortalAccess(role, user.id, settings.enabledUserIds);
  }

  const section = pathnameToSection(pathname);
  if (section && !canAccessPage(role, pathname, { clientLavorazioniAllowed })) {
    const url = request.nextUrl.clone();
    url.pathname = ACCESS_DENIED_PATH;
    url.searchParams.set("from", defaultHomePathForRole(role));
    url.searchParams.set("denied", section);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data).*)"],
};
