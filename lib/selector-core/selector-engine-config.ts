/**
 * Selector engine config SSOT (v3.1/v5.2) — resolved from active runtime snapshot.
 */
import { resolveSelectorEngineConfig } from "@/lib/selector-core/selector-config-runtime-loader";

export const selectorEngineConfig = resolveSelectorEngineConfig();

/** @deprecated use selectorEngineConfig.thresholds.sheetMinOptions */
export const SHEET_MIN_OPTIONS = selectorEngineConfig.thresholds.sheetMinOptions;

/** @deprecated use selectorEngineConfig.rolloutByDomain */
export const SELECTOR_SHEET_ROLLOUT_BY_DOMAIN = selectorEngineConfig.rolloutByDomain;

/** @deprecated use selectorEngineConfig.featureFlags.legacySearchableKeys */
export const SELECTOR_SHEET_SEARCHABLE_KEYS = [] as readonly string[];

function readEnvFlag(name: string): boolean {
  return typeof process !== "undefined" && process.env[name] === "true";
}

/** @deprecated use selectorEngineConfig.featureFlags — evaluated at read time */
export const SELECTOR_SHEET_SEARCHABLE_GLOBAL = readEnvFlag("SELECTOR_SHEET_SEARCHABLE");
export const SELECTOR_SECURITY_GRADUAL_ENABLED = readEnvFlag("SELECTOR_SECURITY_GRADUAL");
export const SELECTOR_DASHBOARD_FILTERS_SHEET_ENABLED = readEnvFlag("SELECTOR_DASHBOARD_FILTERS_SHEET");
