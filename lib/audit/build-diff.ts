import type { AuditLogContext } from "@/lib/gestionale-log/log-summary";

export function auditSnapshot(row: unknown, context?: AuditLogContext): Record<string, unknown> {
  const base: Record<string, unknown> = { snapshot: row };
  if (context?.oggetto) return { ...base, context };
  return base;
}

export function auditDiff(
  before: unknown,
  after: unknown,
  context?: AuditLogContext,
): Record<string, unknown> {
  const base: Record<string, unknown> = { before, after };
  if (context?.oggetto) return { ...base, context };
  return base;
}
