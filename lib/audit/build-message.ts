import type { AuditEventInput } from "@/lib/audit/types";

export function buildAuditSnapshot(
  after: unknown,
  fields?: readonly string[],
): Record<string, unknown> | undefined {
  if (!after || typeof after !== "object" || Array.isArray(after)) return undefined;
  const row = after as Record<string, unknown>;
  if (!fields || fields.length === 0) {
    return { ...row };
  }
  const snapshot: Record<string, unknown> = {};
  for (const key of fields) {
    if (key in row) snapshot[key] = row[key];
  }
  return Object.keys(snapshot).length > 0 ? snapshot : undefined;
}

export function mergePayloadWithSnapshot(
  payload: Record<string, unknown>,
  snapshot?: Record<string, unknown>,
): Record<string, unknown> {
  if (!snapshot || Object.keys(snapshot).length === 0) return payload;
  const metadata =
    payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
      ? { ...(payload.metadata as Record<string, unknown>) }
      : {};
  return {
    ...payload,
    metadata: { ...metadata, snapshot },
  };
}

export function buildTitleFromInput(input: AuditEventInput): string {
  if (input.title?.trim()) return input.title.trim();
  const action = input.action;
  const entity = input.entityType;
  if (action === "CREATE") return `Creato ${entity}`;
  if (action === "DELETE") return `Eliminato ${entity}`;
  if (action === "RESTORE") return `Ripristinato ${entity}`;
  if (input.eventType === "WORKFLOW_ACTION") return `Azione su ${entity}`;
  if (input.eventType === "IMPORT_EVENT") return `Import ${entity}`;
  return `Modificato ${entity}`;
}

export function buildDescriptionFromInput(input: AuditEventInput): string | null {
  if (input.description?.trim()) return input.description.trim();
  if (input.context?.oggetto?.trim()) return input.context.oggetto.trim();
  if (input.context?.entityLabel?.trim()) return input.context.entityLabel.trim();
  return null;
}
