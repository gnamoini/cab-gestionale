import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import type {
  FormUxDomain,
  FormUxFormId,
  FormUxFormRollout,
} from "@/lib/form-ux-migration/types";

export type FormUxSnapshotStrategy = "freeze-per-transaction" | "context-cache";
export type FormUxRollbackPolicy = "form-scoped" | "domain-scoped-no-cascade";

export type FormUxRegistryEntry = {
  formId: FormUxFormId;
  domain: FormUxDomain;
  rolloutEnabled: boolean;
  isolationLevel: "strict" | "shared-safe";
  snapshotStrategy: FormUxSnapshotStrategy;
  rollbackPolicy: FormUxRollbackPolicy;
};

const DOMAIN_BY_FORM: Record<FormUxFormId, FormUxDomain> = {
  ricambio: "ricambio",
  "scheda-ingresso": "lavorazioni",
  lavorazioni: "lavorazioni",
  mezzi: "mezzi",
  preventivi: "preventivi",
  settings: "settings",
};

function computeRolloutEnabled(rollout: FormUxFormRollout): boolean {
  for (const field of Object.values(rollout.fields)) {
    if (!field) continue;
    if (field.mode !== "legacy") return true;
    if (field.enforcement != null && field.enforcement !== "off") return true;
  }
  return false;
}

function buildRegistryEntry(formId: FormUxFormId): FormUxRegistryEntry {
  const rollout = FORM_UX_ROLLOUT[formId];
  const rolloutEnabled = computeRolloutEnabled(rollout);
  return {
    formId,
    domain: DOMAIN_BY_FORM[formId],
    rolloutEnabled,
    isolationLevel: formId === "settings" ? "shared-safe" : "strict",
    snapshotStrategy: rolloutEnabled ? "context-cache" : "freeze-per-transaction",
    rollbackPolicy: "form-scoped",
  };
}

const REGISTRY = new Map<FormUxFormId, FormUxRegistryEntry>(
  (Object.keys(FORM_UX_ROLLOUT) as FormUxFormId[]).map((formId) => [
    formId,
    buildRegistryEntry(formId),
  ]),
);

export function getFormUxRegistry(): ReadonlyMap<FormUxFormId, FormUxRegistryEntry> {
  return REGISTRY;
}

export function getFormUxRegistryEntry(
  formId: FormUxFormId,
): FormUxRegistryEntry | undefined {
  return REGISTRY.get(formId);
}

export function isFormUxRolloutEnabled(formId: FormUxFormId): boolean {
  return REGISTRY.get(formId)?.rolloutEnabled ?? false;
}

const VALID_REGISTRY_PHASES = new Set([1, 2, 3, 4]);

function parseRegistryPhaseEnv(): 1 | 2 | 3 | 4 {
  const n = Number(process.env.NEXT_PUBLIC_FORM_UX_REGISTRY_PHASE ?? "3");
  if (VALID_REGISTRY_PHASES.has(n)) {
    return n as 1 | 2 | 3 | 4;
  }
  return 3;
}

/** Deterministic registry axis phase for UGP. */
export function deriveRegistryPhase(formId: FormUxFormId): 1 | 2 | 3 | 4 {
  const entry = REGISTRY.get(formId);
  if (!entry || !entry.rolloutEnabled) return 1;
  return parseRegistryPhaseEnv();
}
