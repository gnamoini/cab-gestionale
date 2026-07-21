import type { SupabaseClient } from "@supabase/supabase-js";

export const MAINTENANCE_AUDIT_ACTIONS = {
  PRESET_CREATED: "PRESET_CREATED",
  PRESET_UPDATED: "PRESET_UPDATED",
  PRESET_ARCHIVED: "PRESET_ARCHIVED",
  PRESET_VERSION_CREATED: "PRESET_VERSION_CREATED",
  EXECUTION_REGISTERED: "EXECUTION_REGISTERED",
  PARTS_CHANGED: "PARTS_CHANGED",
  TRIGGER_CHANGED: "TRIGGER_CHANGED",
} as const;

export type MaintenanceAuditAction = (typeof MAINTENANCE_AUDIT_ACTIONS)[keyof typeof MAINTENANCE_AUDIT_ACTIONS];

export async function writeMaintenanceAuditEvent(
  client: SupabaseClient,
  input: {
    entity: "preset" | "execution" | "config" | "trigger";
    entityId: string;
    action: MaintenanceAuditAction;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    createdBy?: string | null;
  },
): Promise<void> {
  const { data: user } = await client.auth.getUser();
  const uid = input.createdBy ?? user.user?.id ?? null;
  const { error } = await client.from("maintenance_audit_events").insert({
    entity: input.entity,
    entity_id: input.entityId,
    action: input.action,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    created_by: uid,
  });
  if (error) {
    console.warn("[maintenance-audit]", error.message);
  }
}
