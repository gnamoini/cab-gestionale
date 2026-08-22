/** Classificazione fetch SW — solo funzioni pure, nessun import app/auth/react. */

export type PwaFetchStrategy =
  | "bypass"
  | "network-only"
  | "cache-first"
  | "stale-while-revalidate"
  | "network-first";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Prefix route gestionale autenticate — lista statica, non import RBAC. */
const AUTH_APP_PATH_PREFIXES = [
  "/dashboard",
  "/dipendenti",
  "/sicurezza",
  "/fatturazione",
  "/lavorazioni-clienti",
  "/preventivi",
  "/mezzi",
  "/magazzino",
  "/report",
  "/acesso-negado",
  "/agenda",
  "/lavorazioni",
  "/documenti",
  "/impostazioni",
] as const;

const PUBLIC_HTML_PATHS = ["/offline", "/privacy-policy", "/termini-e-condizioni"] as const;

export function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

export function isPublicHtmlPath(pathname: string): boolean {
  if (isLoginPath(pathname)) return true;
  return PUBLIC_HTML_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isAuthenticatedAppPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return AUTH_APP_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function classifyRequest(url: URL, method: string, mode?: RequestMode): PwaFetchStrategy {
  if (url.protocol === "wss:" || url.protocol === "ws:") return "bypass";
  if (url.hostname.endsWith(".supabase.co") && url.pathname.includes("/realtime")) return "bypass";

  const normalizedMethod = method.toUpperCase();
  if (MUTATION_METHODS.has(normalizedMethod)) return "network-only";
  if (url.hostname.endsWith(".supabase.co")) return "network-only";
  if (url.pathname.startsWith("/api/")) return "network-only";

  if (url.pathname.startsWith("/_next/static/")) return "cache-first";
  if (url.pathname.startsWith("/icons/")) return "cache-first";
  if (/\.(woff2?|ttf|eot|otf)$/i.test(url.pathname)) return "cache-first";

  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)) return "stale-while-revalidate";
  if (url.pathname.startsWith("/_next/image")) return "stale-while-revalidate";

  if (mode === "navigate") {
    if (isAuthenticatedAppPath(url.pathname)) return "network-only";
    if (isPublicHtmlPath(url.pathname)) return "network-first";
    return "network-only";
  }

  return "network-only";
}
