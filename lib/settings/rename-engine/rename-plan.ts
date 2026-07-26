import { randomUUID } from "node:crypto";
import type { SettingsRenameKind } from "@/lib/settings/settings-rename-types";
import { buildClienteEntityKey, buildNamedListEntityKey } from "@/lib/validation/entity-keys";
import type { EntityValidationContext } from "@/lib/validation/entity-keys";
import { RENAME_ENGINE_VERSION, RENAME_PLAN_VERSION } from "@/lib/settings/rename-engine/constants";
import { getOperationIdsForKind } from "@/lib/settings/rename-engine/rename-operation-registry";
import type { RenamePlan } from "@/lib/settings/rename-engine/types";

const KIND_ENTITY_CONTEXT: Partial<Record<SettingsRenameKind, EntityValidationContext>> = {
  cliente: "cliente",
  utilizzatore: "utilizzatore",
  cantiere: "cantiere",
};

export function resolveEntityKeyForKind(kind: SettingsRenameKind, label: string): string | undefined {
  const ctx = KIND_ENTITY_CONTEXT[kind];
  if (ctx) return buildNamedListEntityKey(label, ctx);
  if (kind === "cliente") return buildClienteEntityKey(label);
  return undefined;
}

export function buildRenamePlan(input: {
  kind: SettingsRenameKind;
  oldLabel: string;
  newLabel: string;
  entityId?: string;
  correlationId?: string;
}): RenamePlan {
  const oldLabel = input.oldLabel.trim();
  const newLabel = input.newLabel.trim();
  const entityKey = resolveEntityKeyForKind(input.kind, oldLabel) || undefined;

  return {
    engineVersion: RENAME_ENGINE_VERSION,
    planVersion: RENAME_PLAN_VERSION,
    kind: input.kind,
    entityId: input.entityId,
    entityKey,
    oldLabel,
    newLabel,
    correlationId: input.correlationId ?? randomUUID(),
    operationIds: [...getOperationIdsForKind(input.kind)],
  };
}

export function invertRenamePlan(plan: RenamePlan, correlationId?: string): RenamePlan {
  return {
    ...plan,
    oldLabel: plan.newLabel,
    newLabel: plan.oldLabel,
    correlationId: correlationId ?? randomUUID(),
  };
}
