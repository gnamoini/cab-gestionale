import type {
  FormUxFieldId,
  FormUxFieldSnapshot,
  FormUxFormId,
  FormUxResolvedComponent,
} from "@/lib/form-ux-migration/types";

const registries = new Map<FormUxFormId, Map<FormUxFieldId, FormUxFieldSnapshot>>();

function getFormRegistry(formId: FormUxFormId): Map<FormUxFieldId, FormUxFieldSnapshot> {
  let formRegistry = registries.get(formId);
  if (!formRegistry) {
    formRegistry = new Map();
    registries.set(formId, formRegistry);
  }
  return formRegistry;
}

export function registerFormUxFieldSnapshot(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  snapshot: {
    legacy: string;
    ssot: string;
    normalizedLegacy: string;
    normalizedSsot: string;
    lastWrite?: FormUxResolvedComponent;
    ts?: number;
  },
): FormUxFieldSnapshot {
  const entry: FormUxFieldSnapshot = {
    legacy: snapshot.legacy,
    ssot: snapshot.ssot,
    normalizedLegacy: snapshot.normalizedLegacy,
    normalizedSsot: snapshot.normalizedSsot,
    lastWrite: snapshot.lastWrite ?? "legacy",
    ts: snapshot.ts ?? Date.now(),
  };
  getFormRegistry(formId).set(fieldId, entry);
  return entry;
}

export function getFormUxFieldSnapshot(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): FormUxFieldSnapshot | undefined {
  return registries.get(formId)?.get(fieldId);
}

export function getFormUxFieldRegistry(
  formId: FormUxFormId,
): ReadonlyMap<FormUxFieldId, FormUxFieldSnapshot> {
  return getFormRegistry(formId);
}

/** fieldId → ssot raw value for submit reconciliation. */
export function getFormUxSsotState(formId: FormUxFormId): Record<string, string> {
  const formRegistry = registries.get(formId);
  if (!formRegistry) return {};
  const out: Record<string, string> = {};
  for (const [fieldId, snapshot] of formRegistry) {
    out[fieldId] = snapshot.ssot;
  }
  return out;
}

export function clearFormUxFieldRegistry(formId: FormUxFormId): void {
  registries.delete(formId);
}

export function clearAllFormUxFieldRegistries(): void {
  registries.clear();
}
