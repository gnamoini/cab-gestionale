/** Gate SSOT — zero import from timeline/waterfall/cold-start modules in critical shell. */
export function isNavigationBootDiagnosticsEnabled(): boolean {
  if (
    process.env.NEXT_PUBLIC_BOOT_INVESTIGATION === "1" ||
    process.env.NEXT_PUBLIC_PERF_DIAGNOSTICS === "1"
  ) {
    return true;
  }
  if (typeof window !== "undefined") {
    return (window as Window & { __cabForceNavDiagnostics?: boolean }).__cabForceNavDiagnostics === true;
  }
  return false;
}
