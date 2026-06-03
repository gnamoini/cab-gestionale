/**
 * Global Flex System — policy charter (SSOT non-breaking).
 *
 * Principio: correggere SOLO nuovi componenti; legacy grandfathered via
 * `.eslint-flex-baseline.json` + allowlist runtime. Zero refactor retroattivo.
 */

import {
  FLEX_SCOPE_CLASS,
  flexSafeCol,
  flexSafeItem,
  flexSafeRow,
  textSafe,
} from "@/lib/ui/global-flex-system";
import { FLEX_CONTRACT } from "@/lib/ui-design-system-lock/component-contracts";
import { layoutPageRoot, layoutResponsiveCoreScope } from "@/lib/ui/responsive-layout-core";
import { dsStackPage } from "@/lib/ui/design-system";
import {
  FLEX_CLOSED_GOVERNANCE_LOOP,
  FLEX_FREEZE_MANIFEST_PATH,
  FLEX_GOVERNANCE_UPDATE_STEPS,
  FLEX_HARD_LOCK_UPDATE_PROTOCOL,
  FLEX_SYSTEM_ABSOLUTE_FINAL_STATE,
  FLEX_SYSTEM_FREEZE_MODE,
  FLEX_SYSTEM_GOVERNANCE_MODE,
  FLEX_SYSTEM_HARD_LOCK_MODE,
  FLEX_BASELINE_PATH,
} from "@/lib/ui/flex-system-freeze";
import type { UIPageSchema, LayoutVariant } from "@/lib/ui-os/ui-schema";

export {
  FLEX_SYSTEM_FREEZE_MODE,
  FLEX_SYSTEM_GOVERNANCE_MODE,
  FLEX_SYSTEM_HARD_LOCK_MODE,
  FLEX_SYSTEM_ABSOLUTE_FINAL_STATE,
  FLEX_BASELINE_PATH,
  FLEX_FREEZE_MANIFEST_PATH,
  FLEX_GOVERNANCE_UPDATE_STEPS,
  FLEX_HARD_LOCK_UPDATE_PROTOCOL,
  FLEX_CLOSED_GOVERNANCE_LOOP,
};

/** Immutable governance entities — modifiable only via approved update flow. */
const _FLEX_IMMUTABLE_INVARIANTS = {
  baseline: FLEX_BASELINE_PATH,
  allowlist: "FLEX_OVERFLOW_ALLOWLIST",
  manifest: FLEX_FREEZE_MANIFEST_PATH,
} as const;

export const FLEX_IMMUTABLE_INVARIANTS = Object.freeze({ ..._FLEX_IMMUTABLE_INVARIANTS });

/** Tre pattern ufficiali flex-safe. */
export const FLEX_SAFE_MODES = {
  row: {
    token: flexSafeRow,
    purpose: "layout orizzontale controllato — no wrap implicito, min-w-0 sui figli",
  },
  col: {
    token: flexSafeCol,
    purpose: "layout verticale stabile — evita overflow su contenitori dinamici",
  },
  item: {
    token: flexSafeItem,
    purpose: "min-width:0, overflow hidden, flex-shrink safe",
  },
  text: {
    token: textSafe,
    purpose: "testo troncabile dentro flex — ellipsis safe",
  },
} as const;

/** Regola base: ogni figlio flex con contenuto dinamico deve avere contenimento esplicito. */
export const FLEX_BASE_RULES = [
  "min-width: 0 sui figli flex che contengono testo o contenuti dinamici",
  "overflow controllato esplicito — mai overflow pagina da table/toolbar",
  "nessun flex-wrap globale — wrap solo esplicito per componente",
] as const;

export const MODAL_FLEX_RULES = [
  "corpo modale: flex-safe-col o layoutFlexColSafe",
  "scroll interno al container ([data-cab-modal-scroll])",
  "keyboard-safe mobile via visualViewport / --cab-keyboard-inset",
] as const;

export const TOOLBAR_FLEX_RULES = [
  "comportamento canonico Lavorazioni — PageToolbar + ToolbarGroup",
  "scroll naturale pagina — NO sticky toolbar globale (dsStickyToolbar vietato)",
  "search flex-fill-safe, actions shrink-0",
] as const;

export const TABLE_FLEX_RULES = [
  "overflow SOLO interno al wrapper (globalTableWrap)",
  "mai overflow orizzontale pagina",
  "celle shrink-safe (gestionaleListTableTd / globalTableThCell)",
] as const;

export const MOBILE_FLEX_RULES = [
  "zero overflow orizzontale viewport",
  "fallback verticale solo esplicito per breakpoint — no wrap globale",
  "audit mobile: fixed-width-on-mobile + page-horizontal-overflow",
] as const;

/** Layer di enforcement — ordine consigliato. */
export const FLEX_ENFORCEMENT_LAYERS = {
  cssScope: FLEX_SCOPE_CLASS,
  eslintRule: "cab-layout/no-flex-overflow-risk",
  eslintBaseline: ".eslint-flex-baseline.json",
  runtimeAuditPrefix: "[flex-system-audit]",
  visualLinter: "lib/ui-visual-linter",
  designSystemLock: "lib/ui-design-system-lock",
  uiOsFlexGate: "validateFlexSystemPolicy",
} as const;

/** Production freeze rules — baseline immutable, forward-safe only. */
export const FLEX_FREEZE_RULES = [
  "baseline grandfathered violations are immutable without FLEX_BASELINE_APPROVED=1",
  "FLEX_OVERFLOW_ALLOWLIST changes require explicit PR + flex-freeze-manifest bump",
  "new flex violations blocked by ESLint ERROR + flex:freeze:gate CI",
  "no retroactive auto-fix on legacy components",
] as const;

/** Governance mode rules — CI is enforcement authority, runtime is observer only. */
export const FLEX_GOVERNANCE_RULES = [
  ...FLEX_FREEZE_RULES,
  "governance mode active: FLEX_SYSTEM_GOVERNANCE_MODE must remain true",
  "baseline checksum validated against flex-freeze-manifest.json on every CI run",
  "updates require FLEX_GOVERNANCE_UPDATE_STEPS — no auto-diff modification",
  "CI runs flex:eslint:gate + flex:freeze:gate — not full lint on legacy flex",
  "runtime audit logs only — never blocks UI render",
] as const;

/** Post-governance hard lock — absolute invariants, CI is final authority. */
export const FLEX_HARD_LOCK_RULES = [
  ...FLEX_GOVERNANCE_RULES,
  "hard lock active: FLEX_SYSTEM_HARD_LOCK_MODE must remain true and non-overridable at runtime",
  "CI is sole enforcement authority — no runtime flex enforcement side effects",
  "no structural flex change without FLEX_HARD_LOCK_UPDATE_PROTOCOL",
  "flexSystemState UNSAFE always forces UI OS legacy render",
] as const;

/** Frozen read-only reference — enforcement SSOT, no extension allowed. */
export const FLEX_HARD_LOCK_RULES_FROZEN = Object.freeze([...FLEX_HARD_LOCK_RULES]);

/** Absolute final state — terminal rules atop hard lock SSOT. */
export const FLEX_ABSOLUTE_FINAL_RULES = [
  ...FLEX_HARD_LOCK_RULES,
  "absolute final state: no system scope extension without closed governance loop",
] as const;

/**
 * UI OS integration — flex safety NON bypassabile da driftScore.
 * Ordine pipeline: schema → contract → flex → drift.
 */
export const UI_OS_FLEX_INTEGRATION = {
  validationOrder: ["schema", "contract", "flex", "drift"] as const,
  flexBlocksOsRender: true,
  driftCannotBypassFlex: true,
  fallbackPreservesLayout: true,
} as const;

/** UI OS governance contract — flex system cannot be bypassed by drift. */
export const UI_OS_GOVERNANCE_CONTRACT = {
  flexUnsafeForcesLegacy: true,
  driftCannotBypassFlex: true,
  maxDriftForOsRender: 20,
  validationOrder: UI_OS_FLEX_INTEGRATION.validationOrder,
} as const;

/** UI OS absolute final contract — immutable execution order, no bypass. */
export const UI_OS_ABSOLUTE_FINAL_CONTRACT = UI_OS_GOVERNANCE_CONTRACT;

export type FlexSystemGovernanceContract = {
  governanceMode: typeof FLEX_SYSTEM_GOVERNANCE_MODE;
  invariants: typeof FLEX_IMMUTABLE_INVARIANTS;
  governanceRules: typeof FLEX_GOVERNANCE_RULES;
  updateSteps: typeof FLEX_GOVERNANCE_UPDATE_STEPS;
  uiOs: typeof UI_OS_GOVERNANCE_CONTRACT;
};

export const FlexSystemGovernanceContract: FlexSystemGovernanceContract = {
  governanceMode: FLEX_SYSTEM_GOVERNANCE_MODE,
  invariants: FLEX_IMMUTABLE_INVARIANTS,
  governanceRules: FLEX_GOVERNANCE_RULES,
  updateSteps: FLEX_GOVERNANCE_UPDATE_STEPS,
  uiOs: UI_OS_GOVERNANCE_CONTRACT,
};

export type FlexSystemState = "SAFE" | "UNSAFE";

/** Maps policy validation to UI OS coupling state — no render logic change. */
export function resolveFlexSystemState(schema: UIPageSchema): FlexSystemState {
  return validateFlexSystemPolicy(schema).safe ? "SAFE" : "UNSAFE";
}

/** CI-only governance contract verification. */
export function verifyFlexSystemGovernanceContract(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (FLEX_SYSTEM_HARD_LOCK_MODE !== true) {
    errors.push("FLEX_SYSTEM_HARD_LOCK_MODE must be true");
  }
  if (FLEX_SYSTEM_GOVERNANCE_MODE !== true) {
    errors.push("FLEX_SYSTEM_GOVERNANCE_MODE must be true");
  }
  if (FlexSystemGovernanceContract.governanceMode !== true) {
    errors.push("FlexSystemGovernanceContract.governanceMode must be true");
  }
  if (UI_OS_GOVERNANCE_CONTRACT.flexUnsafeForcesLegacy !== true) {
    errors.push("UI_OS_GOVERNANCE_CONTRACT.flexUnsafeForcesLegacy must be true");
  }
  if (Object.keys(FLEX_IMMUTABLE_INVARIANTS).length !== 3) {
    errors.push("FLEX_IMMUTABLE_INVARIANTS must have exactly 3 keys");
  }

  return { valid: errors.length === 0, errors };
}

export type FlexSystemHardLockContract = {
  hardLockMode: typeof FLEX_SYSTEM_HARD_LOCK_MODE;
  invariants: typeof FLEX_IMMUTABLE_INVARIANTS;
  hardLockRules: typeof FLEX_HARD_LOCK_RULES;
  updateProtocol: typeof FLEX_HARD_LOCK_UPDATE_PROTOCOL;
  governance: FlexSystemGovernanceContract;
  flexSystemStateSemantics: {
    SAFE: "UI OS render allowed when drift <= maxDriftForOsRender";
    UNSAFE: "UI OS forced legacy render via flex_unsafe";
  };
};

export const FlexSystemHardLockContract: FlexSystemHardLockContract = {
  hardLockMode: FLEX_SYSTEM_HARD_LOCK_MODE,
  invariants: FLEX_IMMUTABLE_INVARIANTS,
  hardLockRules: FLEX_HARD_LOCK_RULES,
  updateProtocol: FLEX_HARD_LOCK_UPDATE_PROTOCOL,
  governance: FlexSystemGovernanceContract,
  flexSystemStateSemantics: {
    SAFE: "UI OS render allowed when drift <= maxDriftForOsRender",
    UNSAFE: "UI OS forced legacy render via flex_unsafe",
  },
};

/** CI-only absolute final state verification — extends governance contract. */
export function verifyFlexSystemAbsoluteFinalState(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const governance = verifyFlexSystemGovernanceContract();
  if (!governance.valid) {
    errors.push(...governance.errors);
  }

  if (FLEX_SYSTEM_ABSOLUTE_FINAL_STATE !== true) {
    errors.push("FLEX_SYSTEM_ABSOLUTE_FINAL_STATE must be true");
  }
  if (FlexSystemHardLockContract.hardLockMode !== true) {
    errors.push("FlexSystemHardLockContract.hardLockMode must be true");
  }
  if (!Object.isFrozen(FLEX_IMMUTABLE_INVARIANTS)) {
    errors.push("FLEX_IMMUTABLE_INVARIANTS must be frozen");
  }

  return { valid: errors.length === 0, errors };
}

export type FlexSystemAbsoluteFinalContract = {
  absoluteFinalState: typeof FLEX_SYSTEM_ABSOLUTE_FINAL_STATE;
  invariants: typeof FLEX_IMMUTABLE_INVARIANTS;
  hardLockRulesSsot: typeof FLEX_HARD_LOCK_RULES;
  absoluteFinalRules: typeof FLEX_ABSOLUTE_FINAL_RULES;
  closedGovernanceLoop: typeof FLEX_CLOSED_GOVERNANCE_LOOP;
  uiOs: typeof UI_OS_ABSOLUTE_FINAL_CONTRACT;
  hardLock: FlexSystemHardLockContract;
};

export const FlexSystemAbsoluteFinalContract: FlexSystemAbsoluteFinalContract = {
  absoluteFinalState: FLEX_SYSTEM_ABSOLUTE_FINAL_STATE,
  invariants: FLEX_IMMUTABLE_INVARIANTS,
  hardLockRulesSsot: FLEX_HARD_LOCK_RULES,
  absoluteFinalRules: FLEX_ABSOLUTE_FINAL_RULES,
  closedGovernanceLoop: FLEX_CLOSED_GOVERNANCE_LOOP,
  uiOs: UI_OS_ABSOLUTE_FINAL_CONTRACT,
  hardLock: FlexSystemHardLockContract,
};

export type FlexSystemCharter = {
  safeModes: typeof FLEX_SAFE_MODES;
  baseRules: typeof FLEX_BASE_RULES;
  modalRules: typeof MODAL_FLEX_RULES;
  toolbarRules: typeof TOOLBAR_FLEX_RULES;
  tableRules: typeof TABLE_FLEX_RULES;
  mobileRules: typeof MOBILE_FLEX_RULES;
  layers: typeof FLEX_ENFORCEMENT_LAYERS;
  uiOs: typeof UI_OS_FLEX_INTEGRATION;
  freezeRules: typeof FLEX_FREEZE_RULES;
  governanceRules: typeof FLEX_GOVERNANCE_RULES;
  hardLockRules: typeof FLEX_HARD_LOCK_RULES;
  absoluteFinalRules: typeof FLEX_ABSOLUTE_FINAL_RULES;
};

export const FlexSystemCharter: FlexSystemCharter = {
  safeModes: FLEX_SAFE_MODES,
  baseRules: FLEX_BASE_RULES,
  modalRules: MODAL_FLEX_RULES,
  toolbarRules: TOOLBAR_FLEX_RULES,
  tableRules: TABLE_FLEX_RULES,
  mobileRules: MOBILE_FLEX_RULES,
  layers: FLEX_ENFORCEMENT_LAYERS,
  uiOs: UI_OS_FLEX_INTEGRATION,
  freezeRules: FLEX_FREEZE_RULES,
  governanceRules: FLEX_GOVERNANCE_RULES,
  hardLockRules: FLEX_HARD_LOCK_RULES,
  absoluteFinalRules: FLEX_ABSOLUTE_FINAL_RULES,
};

const LAYOUT_FLEX_TOKENS: Record<string, readonly string[]> = {
  "gestionale-core": [layoutPageRoot, layoutResponsiveCoreScope, ...FLEX_CONTRACT.containmentMarkers],
  "report-dashboard": [dsStackPage, "min-w-0", "max-w-full"],
  legacy: ["min-w-0"],
};

const LAYOUT_RESOLVED_TOKENS: Record<LayoutVariant, string> = {
  "gestionale-core": `${layoutPageRoot} ${layoutResponsiveCoreScope}`,
  "report-dashboard": dsStackPage,
  legacy: layoutPageRoot,
};

function layoutTokenString(variant: UIPageSchema["layout"]): string {
  const key = variant ?? "gestionale-core";
  return LAYOUT_RESOLVED_TOKENS[key];
}

/** UI OS + flex system policy validation — drift cannot bypass this gate. */
export function validateFlexSystemPolicy(schema: UIPageSchema): { safe: boolean; errors: string[] } {
  const errors: string[] = [];
  const layout = schema.layout ?? "gestionale-core";
  const resolved = layoutTokenString(layout);
  const required = LAYOUT_FLEX_TOKENS[layout] ?? LAYOUT_FLEX_TOKENS.legacy;

  const hasMinWidthContainment = required.some(
    (t) => resolved.includes(t) || t.split(" ").every((p) => resolved.includes(p)),
  );
  if (!hasMinWidthContainment && !resolved.includes("min-w-0")) {
    errors.push(`layout ${layout}: missing min-width containment in resolved shell`);
  }

  if (layout === "gestionale-core") {
    const strictOk =
      resolved.includes("min-w-0") &&
      (resolved.includes(layoutResponsiveCoreScope) ||
        FLEX_CONTRACT.containmentMarkers.some((m) => resolved.includes(m)));
    if (!strictOk) {
      errors.push(`layout gestionale-core: missing flex scope / containment marker`);
    }
  }

  return { safe: errors.length === 0, errors };
}

/** @deprecated Use validateFlexSystemPolicy */
export function validateFlexSafety(schema: UIPageSchema): { safe: boolean; errors: string[] } {
  return validateFlexSystemPolicy(schema);
}

/** Runtime audit debounce — evita false positive SSR/hydration. */
export const FLEX_AUDIT_HYDRATION_DELAY_MS = 500;
