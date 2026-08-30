/**
 * Feature-flag SSOT for boot investigation — zero import from boot-investigation.ts.
 * Enable: NEXT_PUBLIC_BOOT_INVESTIGATION=1 or NEXT_PUBLIC_PERF_DIAGNOSTICS=1
 */

export function isBootInvestigationEnabled(): boolean {
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

/** No-op in critical graph — real mount logging lives in diagnostics pack. */
export function useBootInvestigationMount(
  _name: string,
  _meta?: Record<string, unknown>,
): void {
  void _name;
  void _meta;
  /* ponytail: gate-only hook avoids static edge to boot-investigation.ts */
}
