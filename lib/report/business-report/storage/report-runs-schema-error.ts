/** PostgREST / Postgres errors when `report_runs` migration was not applied. */
export function isReportRunsSchemaError(message?: string | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("report_runs") &&
    (m.includes("schema cache") ||
      m.includes("does not exist") ||
      m.includes("could not find") ||
      m.includes("relation") && m.includes("does not exist"))
  );
}
