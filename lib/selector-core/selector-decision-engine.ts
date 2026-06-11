/**
 * SelectorDecisionEngine v3.1 — deterministic, observable, failure-safe SSOT.
 */
import { registerSelectorDecision } from "@/lib/selector-core/selector-telemetry-bridge";
import {
  createFallbackDecision,
  normalizeSelectorContext,
} from "@/lib/selector-core/selector-safe-fallback";
import { getLastFallbackTrace } from "@/lib/selector-core/selector-fallback-trace";
import {
  getLastRuntimeContextSnapshot,
  wasDriftDetectedAtSelection,
} from "@/lib/selector-core/selector-config-runtime-loader";
import { selectorEngineConfig } from "@/lib/selector-core/selector-engine-config";
import { resolveDecisionRuleBand } from "@/lib/selector-core/selector-thresholds";
import type {
  SelectorContext,
  SelectorDomain,
  SelectorSurface,
  SelectorSurfaceDecision,
  SelectorSurfaceKind,
  SheetRolloutStatus,
} from "@/lib/selector-core/types";

export {
  SHEET_MIN_OPTIONS,
  SELECTOR_SHEET_ROLLOUT_BY_DOMAIN,
} from "@/lib/selector-core/selector-engine-config";
export { resolveDecisionRuleBand } from "@/lib/selector-core/selector-thresholds";

let traceCounter = 0;
const deterministicCache = new Map<string, SelectorSurfaceDecision>();

function nextTraceId(): string {
  traceCounter += 1;
  return `sel-${traceCounter}`;
}

export function hashSelectorContext(ctx: SelectorContext): string {
  const stable = {
    domain: ctx.domain,
    mode: ctx.mode,
    optionCount: ctx.optionCount,
    isMobile: ctx.isMobile,
    isDynamicList: ctx.isDynamicList,
    isOperationalFilter: ctx.isOperationalFilter,
    rolloutKey: ctx.rolloutKey ?? "",
    userRole: ctx.userRole ?? "",
    mobileSheetEnabled: ctx.mobileSheetEnabled ?? true,
    mobileSheetMode: ctx.mobileSheetMode ?? "",
    minSheetOptions: ctx.minSheetOptions ?? selectorEngineConfig.thresholds.sheetMinOptions,
  };
  return JSON.stringify(stable);
}

function stableDecisionSnapshot(decision: SelectorSurfaceDecision): string {
  return JSON.stringify({
    surface: decision.surface,
    reasoning: decision.reasoning,
    flags: decision.flags,
    matchedRules: decision.matchedRules ?? [],
    fallbackUsed: decision.fallbackUsed ?? false,
  });
}

export function assertDeterministic(inputHash: string, output: SelectorSurfaceDecision): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return;

  const snapshot = stableDecisionSnapshot(output);
  const cached = deterministicCache.get(inputHash);
  if (cached && stableDecisionSnapshot(cached) !== snapshot) {
    console.error("[SelectorDecisionEngine] determinism violation", { inputHash, cached, output });
    return;
  }
  deterministicCache.set(inputHash, output);
}

/** Test-only */
export function __resetSelectorEngineForTests(): void {
  traceCounter = 0;
  deterministicCache.clear();
}

function isKnownDomain(domain: string): domain is SelectorDomain {
  return domain in selectorEngineConfig.rolloutByDomain;
}

function resolveRolloutStatusEnabled(status: SheetRolloutStatus): boolean {
  const flags = selectorEngineConfig.featureFlags;
  if (status === "ENABLED") return true;
  if (status === "DISABLED") return false;
  if (status === "GRADUAL") return flags.securityGradual;
  if (status === "PARTIAL") return flags.dashboardFiltersSheet;
  return false;
}

export function isSelectorDomainSheetRolloutEnabled(domain?: SelectorDomain | string): boolean {
  if (!domain?.trim()) return false;
  const key = isKnownDomain(domain) ? domain : undefined;
  if (!key) {
    const flags = selectorEngineConfig.featureFlags;
    if (!flags.sheetSearchableGlobal) return false;
    return flags.legacySearchableKeys.includes(domain);
  }
  const status = selectorEngineConfig.rolloutByDomain[key];
  return resolveRolloutStatusEnabled(status);
}

export function shouldUpgradeToSearch(params: {
  optionCount: number;
  dynamicList?: boolean;
  operationalFilter?: boolean;
  isDynamicList?: boolean;
  isOperationalFilter?: boolean;
}): boolean {
  const band = resolveDecisionRuleBand(params.optionCount);
  const dynamicList = params.isDynamicList ?? params.dynamicList ?? false;
  const operationalFilter = params.isOperationalFilter ?? params.operationalFilter ?? false;
  if (band === "20-100" || band === "100+") return true;
  if (band === "6-20" && (dynamicList || operationalFilter)) return true;
  return false;
}

function resolveDomain(ctx: SelectorContext): string {
  if (typeof ctx.domain === "string" && ctx.domain.trim()) return ctx.domain.trim();
  return ctx.rolloutKey?.trim() ?? "";
}

function isSelectOnlyPolicyViolation(ctx: SelectorContext): boolean {
  if (ctx.mode !== "selectOnly") return false;
  if (ctx.isDynamicList || ctx.isOperationalFilter) return true;
  const domain = resolveDomain(ctx);
  if (domain === "addetti" || domain === "dipendenti") return true;
  if (domain === "security" && selectorEngineConfig.featureFlags.securityGradual) return true;
  return false;
}

function meetsSheetOptionThreshold(ctx: SelectorContext): boolean {
  const minOptions = ctx.minSheetOptions ?? selectorEngineConfig.thresholds.sheetMinOptions;
  if (ctx.optionCount > minOptions) return true;
  if (minOptions !== 0) return false;
  // Soglia 0 (dominio rollout): sheet anche con elenco vuoto — empty state / aggiungi.
  if (ctx.mode === "selectOnly") return true;
  return ctx.mode === "searchable" || ctx.mobileSheetMode === "searchable";
}

function isSheetEligible(ctx: SelectorContext): boolean {
  if (!ctx.isMobile) return false;
  if (!meetsSheetOptionThreshold(ctx)) return false;
  const domain = resolveDomain(ctx);
  return isSelectorDomainSheetRolloutEnabled(domain || undefined);
}

function isSearchableRolloutEnabled(ctx: SelectorContext): boolean {
  const domain = resolveDomain(ctx);
  if (domain && isKnownDomain(domain)) {
    return isSelectorDomainSheetRolloutEnabled(domain);
  }
  const flags = selectorEngineConfig.featureFlags;
  if (!flags.sheetSearchableGlobal) return false;
  if (!ctx.rolloutKey?.trim()) return false;
  return flags.legacySearchableKeys.includes(ctx.rolloutKey);
}

function buildFlags(surface: SelectorSurfaceKind, ctx: SelectorContext): SelectorSurfaceDecision["flags"] {
  const usesSheet = surface === "sheet";
  const isSelectOnly = ctx.mode === "selectOnly";
  const sheetSearchable =
    surface === "sheet" &&
    ctx.mobileSheetMode !== "selectOnly" &&
    isSelectOnly === false &&
    (ctx.mode === "searchable" || ctx.mobileSheetMode === "searchable");
  const usesSearch = surface === "searchableDropdown" || sheetSearchable;
  return { usesSheet, usesSearch, isSelectOnly };
}

function resolveSurfaceKind(
  ctx: SelectorContext,
  reasoning: string[],
  matchedRules: string[],
): SelectorSurfaceKind {
  if (ctx.mobileSheetMode === "off") {
    matchedRules.push("rule.mobileSheetOff");
    reasoning.push("mobileSheetMode=off → dropdown");
    return ctx.mode === "selectOnly" ? "dropdown" : "searchableDropdown";
  }

  const mobileSheetOn = ctx.mobileSheetEnabled !== false;
  const eligible = isSheetEligible(ctx) && mobileSheetOn;

  if (!eligible) {
    matchedRules.push("rule.sheetIneligible");
    reasoning.push(
      ctx.isMobile
        ? `sheet ineligible (count=${ctx.optionCount}, domain=${resolveDomain(ctx) || "?"})`
        : "desktop → no sheet",
    );
    if (!ctx.isMobile) matchedRules.push("rule.desktopSearchableDropdown");
    return ctx.mode === "selectOnly" ? "dropdown" : "searchableDropdown";
  }

  matchedRules.push("rule.sheetEligible");

  if (ctx.mode === "selectOnly" || ctx.mobileSheetMode === "selectOnly") {
    matchedRules.push("rule.selectOnlySheet");
    reasoning.push("selectOnly sheet (mode or mobileSheetMode) → sheet list");
    return "sheet";
  }

  const searchableMode = ctx.mode === "searchable" || ctx.mobileSheetMode === "searchable";
  if (searchableMode && isSearchableRolloutEnabled(ctx)) {
    matchedRules.push("rule.searchableSheet");
    reasoning.push("searchable + rollout enabled → sheet");
    return "sheet";
  }

  matchedRules.push("rule.searchableDropdown");
  reasoning.push("searchable without sheet rollout → searchableDropdown");
  return "searchableDropdown";
}

function resolveInternal(ctx: SelectorContext, startedAt: number): SelectorSurfaceDecision {
  const reasoning: string[] = [];
  const matchedRules: string[] = [];
  const isSelectOnly = ctx.mode === "selectOnly";
  const surface = resolveSurfaceKind(ctx, reasoning, matchedRules);

  if (isSelectOnlyPolicyViolation(ctx)) {
    matchedRules.push("rule.policy.selectOnlyViolation");
    reasoning.push("policy: selectOnly discouraged on dynamic/operational list (warn-only)");
  }

  if (
    shouldUpgradeToSearch({
      optionCount: ctx.optionCount,
      isDynamicList: ctx.isDynamicList,
      isOperationalFilter: ctx.isOperationalFilter,
    }) &&
    isSelectOnly
  ) {
    matchedRules.push("rule.policy.searchUpgradeHint");
    reasoning.push("policy: list band suggests searchable upgrade");
  }

  const decisionLatencyMs =
    typeof performance !== "undefined" ? Math.max(0, performance.now() - startedAt) : 0;

  return {
    surface,
    reasoning,
    flags: buildFlags(surface, ctx),
    matchedRules,
    fallbackUsed: false,
    decisionLatencyMs,
  };
}

function finalizeDecision(
  ctx: SelectorContext,
  decision: SelectorSurfaceDecision,
  traceId: string,
  startedAt: number,
): SelectorSurfaceDecision {
  const withMeta: SelectorSurfaceDecision = {
    ...decision,
    traceId,
    decisionLatencyMs:
      decision.decisionLatencyMs ??
      (typeof performance !== "undefined" ? Math.max(0, performance.now() - startedAt) : 0),
  };

  assertDeterministic(hashSelectorContext(ctx), withMeta);

  const fallbackTrace = getLastFallbackTrace();
  const snapshotContext =
    selectorEngineConfig.observability.traceEnabled || selectorEngineConfig.observability.telemetryDebug
      ? {
          selectionPath: fallbackTrace?.selectionPath,
          fallbackChainReason: fallbackTrace?.reasonCodes,
          registrySourceUsed: fallbackTrace?.selectedSource,
          driftDetectedAtSelection: wasDriftDetectedAtSelection(),
          snapshotVersion: fallbackTrace?.selectedVersion,
          pointerEpoch: fallbackTrace?.pointerEpoch,
          runtimeContext: getLastRuntimeContextSnapshot() ?? undefined,
        }
      : {};

  registerSelectorDecision(traceId, {
    traceId,
    inputContext: ctx,
    outputDecision: withMeta,
    reasoning: withMeta.reasoning,
    matchedRules: withMeta.matchedRules ?? [],
    fallbackUsed: withMeta.fallbackUsed ?? false,
    decisionLatencyMs: withMeta.decisionLatencyMs ?? 0,
    recordedAt: Date.now(),
    ...snapshotContext,
  });

  return withMeta;
}

export function toLegacySurface(decision: SelectorSurfaceDecision): SelectorSurface {
  return decision.flags.usesSheet ? "sheet" : "dropdown";
}

export const SelectorDecisionEngine = {
  resolve(ctx: SelectorContext): SelectorSurfaceDecision {
    const startedAt = typeof performance !== "undefined" ? performance.now() : 0;
    const traceId = nextTraceId();

    try {
      const normalized = normalizeSelectorContext(ctx);
      if (normalized.kind === "fallback") {
        const fallback = createFallbackDecision(normalized.fallbackReasoning);
        return finalizeDecision(ctx, fallback, traceId, startedAt);
      }

      const decision = resolveInternal(normalized.ctx, startedAt);
      if (normalized.warnings.length > 0) {
        decision.reasoning = [...normalized.warnings.map((w) => `normalize:${w}`), ...decision.reasoning];
      }
      return finalizeDecision(normalized.ctx, decision, traceId, startedAt);
    } catch (err) {
      const fallback = createFallbackDecision([`runtime_error:${String(err)}`]);
      return finalizeDecision(ctx, fallback, traceId, startedAt);
    }
  },

  resolveWithShadowCheck(
    ctx: SelectorContext,
    legacySurface: SelectorSurface,
    source = "SelectorDecisionEngine",
  ): SelectorSurfaceDecision {
    const decision = SelectorDecisionEngine.resolve(ctx);
    const shadowEnabled =
      typeof process !== "undefined" &&
      process.env.NODE_ENV !== "production" &&
      process.env.SELECTOR_ENGINE_SHADOW === "true";

    if (shadowEnabled && toLegacySurface(decision) !== legacySurface) {
      console.warn(
        `[${source}] selector engine shadow mismatch: engine=${toLegacySurface(decision)} legacy=${legacySurface}`,
        { ctx, decision },
      );
    }

    return decision;
  },
};

export function isSelectorSheetEligible(params: {
  isMobile: boolean;
  optionCount: number;
  domain?: SelectorDomain | string;
  minSheetOptions?: number;
  selectOnly?: boolean;
  searchable?: boolean;
}): boolean {
  if (!params.isMobile) return false;
  const min = params.minSheetOptions ?? selectorEngineConfig.thresholds.sheetMinOptions;
  const meetsThreshold =
    params.optionCount > min ||
    (min === 0 && (params.selectOnly === true || params.searchable === true));
  if (!meetsThreshold) return false;
  return isSelectorDomainSheetRolloutEnabled(params.domain);
}

export function isSelectOnlyPolicyViolationPublic(ctx: {
  selectOnly: boolean;
  domain?: SelectorDomain | string;
  dynamicList?: boolean;
  operationalFilter?: boolean;
}): boolean {
  return isSelectOnlyPolicyViolation({
    domain: ctx.domain ?? selectorEngineConfig.defaultBehavior.defaultDomain,
    mode: ctx.selectOnly ? "selectOnly" : "searchable",
    optionCount: 0,
    isMobile: false,
    isDynamicList: ctx.dynamicList ?? false,
    isOperationalFilter: ctx.operationalFilter ?? false,
  });
}

export function warnSelectOnlyPolicyViolation(
  ctx: {
    selectOnly: boolean;
    domain?: SelectorDomain | string;
    dynamicList?: boolean;
    operationalFilter?: boolean;
  },
  source?: string,
): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return;
  if (!isSelectOnlyPolicyViolationPublic(ctx)) return;
  const tag = source ? `[${source}]` : "";
  console.warn(
    `${tag} selectOnly_policy: selectOnly su lista dinamica/operativa — usare GlobalSelect searchable (domain=${ctx.domain ?? "?"})`,
  );
}

/** @deprecated MOBILE_SHEET_MIN_OPTIONS — use selectorEngineConfig.thresholds.sheetMinOptions */
export const MOBILE_SHEET_MIN_OPTIONS = selectorEngineConfig.thresholds.sheetMinOptions;
