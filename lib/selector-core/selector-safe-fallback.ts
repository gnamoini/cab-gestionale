import { selectorEngineConfig } from "@/lib/selector-core/selector-engine-config";
import { trackDeprecatedUsage } from "@/lib/observability/deprecated-usage";
import type {
  SelectorContext,
  SelectorContextMode,
  SelectorSurfaceDecision,
} from "@/lib/selector-core/types";

export type NormalizeSelectorContextResult =
  | {
      kind: "ok";
      ctx: SelectorContext;
      warnings: string[];
    }
  | {
      kind: "fallback";
      fallbackReasoning: string[];
    };

const VALID_MODES: readonly SelectorContextMode[] = ["selectOnly", "searchable", "default"];

function sanitizeOptionCount(raw: unknown): { value: number; hardFallback: boolean } {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return { value: 0, hardFallback: true };
  }
  if (raw < 0) return { value: 0, hardFallback: false };
  return { value: Math.floor(raw), hardFallback: false };
}

function sanitizeMode(raw: unknown): SelectorContextMode {
  if (typeof raw === "string" && VALID_MODES.includes(raw as SelectorContextMode)) {
    return raw as SelectorContextMode;
  }
  return selectorEngineConfig.defaultBehavior.defaultMode;
}

export function normalizeSelectorContext(raw: Partial<SelectorContext>): NormalizeSelectorContextResult {
  const warnings: string[] = [];
  const { value: optionCount, hardFallback } = sanitizeOptionCount(raw.optionCount);

  if (hardFallback) {
    return {
      kind: "fallback",
      fallbackReasoning: ["invalid_option_count"],
    };
  }

  if (typeof raw.optionCount === "number" && raw.optionCount < 0) {
    warnings.push("optionCount clamped to 0");
  }

  const domain =
    typeof raw.domain === "string" && raw.domain.trim()
      ? raw.domain.trim()
      : selectorEngineConfig.defaultBehavior.defaultDomain;

  const ctx: SelectorContext = {
    domain,
    mode: sanitizeMode(raw.mode),
    optionCount,
    isMobile: Boolean(raw.isMobile),
    isDynamicList: Boolean(raw.isDynamicList),
    isOperationalFilter: Boolean(raw.isOperationalFilter),
    rolloutKey: typeof raw.rolloutKey === "string" ? raw.rolloutKey : undefined,
    userRole: typeof raw.userRole === "string" ? raw.userRole : undefined,
    mobileSheetEnabled:
      raw.mobileSheetEnabled ?? selectorEngineConfig.defaultBehavior.mobileSheetEnabled,
    mobileSheetMode: raw.mobileSheetMode,
    minSheetOptions:
      typeof raw.minSheetOptions === "number" && Number.isFinite(raw.minSheetOptions)
        ? raw.minSheetOptions
        : selectorEngineConfig.thresholds.sheetMinOptions,
  };

  return { kind: "ok", ctx, warnings };
}

export function isContextRecoverable(result: NormalizeSelectorContextResult): boolean {
  return result.kind === "ok";
}

export function createFallbackDecision(fallbackReasoning: string[]): SelectorSurfaceDecision {
  trackDeprecatedUsage("selector-safe-fallback", {
    reasons: fallbackReasoning.join(","),
  });
  return {
    surface: selectorEngineConfig.defaultBehavior.fallbackSurface,
    reasoning: [...fallbackReasoning],
    flags: {
      usesSheet: false,
      usesSearch: false,
      isSelectOnly: false,
    },
    matchedRules: ["fallback.safe"],
    fallbackUsed: true,
  };
}
