/** SSOT: API paths callable by ruolo cliente (portale). All other /api/* require staff. */
export const CLIENTE_API_ALLOWLIST: readonly string[] = [
  "/api/media/image",
  "/api/documents/",
  "/api/lavorazioni/",
  "/api/ddt/",
  "/api/official-documents/",
  "/api/notifications/preferences",
] as const;

export function isClienteAllowedApiPath(pathname: string): boolean {
  return CLIENTE_API_ALLOWLIST.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export function isStaffOnlyApiPath(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/api/cron/")) return false;
  if (pathname.startsWith("/api/webhooks/")) return false;
  if (pathname.startsWith("/api/branding")) return false;
  if (pathname.startsWith("/api/fatturazione/sdi-webhook")) return false;
  return !isClienteAllowedApiPath(pathname);
}
