import type { RolloutState } from "@/lib/form-ux-migration/rollout-state-machine";
import type { FormUxFieldId, FormUxFormId } from "@/lib/form-ux-migration/types";

export const ROLLOUT_STATE_STORAGE_KEY = "form-ux-migration:rollout-state";
const LEGACY_ENFORCEMENT_ROLLBACK_KEY = "form-ux-migration:enforcement-rollback";

const inMemoryStates = new Map<string, RolloutState>();

function fieldKey(formId: FormUxFormId, fieldId: FormUxFieldId): string {
  return `${formId}.${fieldId}`;
}

function readSessionStates(): Record<string, RolloutState> {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(ROLLOUT_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, RolloutState>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessionStates(states: Record<string, RolloutState>): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(ROLLOUT_STATE_STORAGE_KEY, JSON.stringify(states));
  } catch {
    // ignore quota / privacy mode
  }
}

function migrateLegacyEnforcementRollback(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const legacyRaw = sessionStorage.getItem(LEGACY_ENFORCEMENT_ROLLBACK_KEY);
    if (!legacyRaw) return;

    const legacy = JSON.parse(legacyRaw) as Record<string, RolloutState>;
    if (!legacy || typeof legacy !== "object") return;

    const merged = { ...readSessionStates(), ...legacy };
    writeSessionStates(merged);
    sessionStorage.removeItem(LEGACY_ENFORCEMENT_ROLLBACK_KEY);
  } catch {
    // ignore
  }
}

export function readRolloutState(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): RolloutState | null {
  const key = fieldKey(formId, fieldId);
  return inMemoryStates.get(key) ?? readSessionStates()[key] ?? null;
}

export function readAllRolloutStates(): ReadonlyMap<string, RolloutState> {
  const out = new Map<string, RolloutState>(inMemoryStates);
  for (const [key, state] of Object.entries(readSessionStates())) {
    if (!out.has(key)) out.set(key, state);
  }
  return out;
}

/** Sole writer — called only from rollout-rollback-executor. */
export function writeRolloutState(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  state: RolloutState,
): void {
  const key = fieldKey(formId, fieldId);
  inMemoryStates.set(key, state);

  const all = readSessionStates();
  all[key] = state;
  writeSessionStates(all);
}

export function isRolloutStateOverridden(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): boolean {
  return readRolloutState(formId, fieldId) != null;
}

/** Test helper — clear in-memory and session rollout states. */
export function clearRolloutStateStore(): void {
  inMemoryStates.clear();
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(ROLLOUT_STATE_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_ENFORCEMENT_ROLLBACK_KEY);
    } catch {
      // ignore
    }
  }
}

if (typeof sessionStorage !== "undefined") {
  migrateLegacyEnforcementRollback();
  for (const [key, state] of Object.entries(readSessionStates())) {
    inMemoryStates.set(key, state);
  }
}
