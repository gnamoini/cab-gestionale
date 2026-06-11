import { snapshotEnforcementMetrics } from "@/lib/form-ux-migration/enforcement-guardrails";
import { getFormUxFieldRegistry } from "@/lib/form-ux-migration/form-ux-field-registry";
import { normalizeFormUxValue } from "@/lib/form-ux-migration/normalize-and-compare";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import { readRolloutState } from "@/lib/form-ux-migration/rollout-state-store";
import type { RolloutState } from "@/lib/form-ux-migration/rollout-state-machine";
import type { FormUxMetricsSnapshot } from "@/lib/form-ux-migration/enforcement-guardrails";
import type {
  FormUxFieldId,
  FormUxFieldSnapshot,
  FormUxFormId,
} from "@/lib/form-ux-migration/types";

export type FormUxFrozenSnapshot = {
  formId: FormUxFormId;
  legacyState: Readonly<Record<string, unknown>>;
  fieldSnapshots: ReadonlyMap<string, FormUxFieldSnapshot>;
  rolloutStates: ReadonlyMap<string, RolloutState>;
  metricsSnapshot: Readonly<FormUxMetricsSnapshot>;
  ssotByField: Readonly<Record<string, string>>;
  snapshotHash: string;
  frozenAt: number;
};

function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneFieldSnapshot(snapshot: FormUxFieldSnapshot): FormUxFieldSnapshot {
  return {
    legacy: snapshot.legacy,
    ssot: snapshot.ssot,
    normalizedLegacy: snapshot.normalizedLegacy,
    normalizedSsot: snapshot.normalizedSsot,
    lastWrite: snapshot.lastWrite,
    ts: snapshot.ts,
  };
}

export function hashFormUxSnapshot(snapshot: Omit<FormUxFrozenSnapshot, "snapshotHash">): string {
  const payload = {
    formId: snapshot.formId,
    legacyState: snapshot.legacyState,
    fieldSnapshots: [...snapshot.fieldSnapshots.entries()].sort(([a], [b]) => a.localeCompare(b)),
    rolloutStates: [...snapshot.rolloutStates.entries()].sort(([a], [b]) => a.localeCompare(b)),
    ssotByField: snapshot.ssotByField,
    metricsSnapshot: [...snapshot.metricsSnapshot.entries()].sort(([a], [b]) => a.localeCompare(b)),
    frozenAt: snapshot.frozenAt,
  };
  return JSON.stringify(payload);
}

export function freezeFormUxSnapshot(input: {
  formId: FormUxFormId;
  legacyState: Record<string, unknown>;
  fieldIds?: FormUxFieldId[];
}): FormUxFrozenSnapshot {
  const { formId, legacyState } = input;
  const formRollout = FORM_UX_ROLLOUT[formId];
  const fieldIds =
    input.fieldIds ??
    (formRollout ? (Object.keys(formRollout.fields) as FormUxFieldId[]) : []);

  const liveRegistry = getFormUxFieldRegistry(formId);
  const fieldSnapshots = new Map<string, FormUxFieldSnapshot>();
  const ssotByField: Record<string, string> = {};

  for (const fieldId of fieldIds) {
    const live = liveRegistry.get(fieldId);
    if (live) {
      fieldSnapshots.set(fieldId, cloneFieldSnapshot(live));
      ssotByField[fieldId] = live.ssot;
      continue;
    }

    const fieldRollout = formRollout?.fields[fieldId];
    if (!fieldRollout?.stateKey) continue;

    const rawLegacy = legacyState[fieldRollout.stateKey];
    const legacyStr = rawLegacy == null ? "" : String(rawLegacy);
    const normalizedLegacy = normalizeFormUxValue(fieldRollout.kind, legacyStr);
    const synthetic: FormUxFieldSnapshot = {
      legacy: legacyStr,
      ssot: legacyStr,
      normalizedLegacy,
      normalizedSsot: normalizedLegacy,
      lastWrite: "legacy",
      ts: Date.now(),
    };
    fieldSnapshots.set(fieldId, synthetic);
    ssotByField[fieldId] = legacyStr;
  }

  const rolloutStates = new Map<string, RolloutState>();
  for (const fieldId of fieldIds) {
    rolloutStates.set(fieldId, readRolloutState(formId, fieldId) ?? "off");
  }

  const metricsSnapshot = snapshotEnforcementMetrics();
  const frozenAt = Date.now();

  const withoutHash = {
    formId,
    legacyState: deepClone(legacyState),
    fieldSnapshots,
    rolloutStates,
    metricsSnapshot,
    ssotByField: { ...ssotByField },
    frozenAt,
  };

  return {
    ...withoutHash,
    snapshotHash: hashFormUxSnapshot(withoutHash),
  };
}
