/**
 * Feature-flag SSOT for PWA render audit — zero import from pwa-render-diagnostics.ts.
 * Enable: NEXT_PUBLIC_PWA_RENDER_AUDIT=1
 */

export function isPwaRenderAuditEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_PWA_RENDER_AUDIT === "1") return true;
  if (typeof window !== "undefined") {
    return (window as Window & { __cabForcePwaRenderAudit?: boolean }).__cabForcePwaRenderAudit === true;
  }
  return false;
}
