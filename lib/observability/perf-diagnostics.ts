/**
 * Dev-only performance diagnostics flag.
 */
export function isPerfDiagnosticsEnabled(): boolean {
  return (
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_PERF_DIAGNOSTICS === "1"
  );
}
