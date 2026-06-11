/**
 * @advisory v6.3 — shared observation layer types.
 */
export type ObservationDomain =
  | "runtime"
  | "policy"
  | "snapshot"
  | "explainability"
  | "gc"
  | "build"
  | "fallback";

export type ObservationEventType =
  | "gc"
  | "policy"
  | "snapshot"
  | "fallback"
  | "decision";

export const OBSERVATION_DOMAINS: readonly ObservationDomain[] = [
  "runtime",
  "policy",
  "snapshot",
  "explainability",
  "gc",
  "build",
  "fallback",
] as const;

export const OBSERVATION_EVENT_TYPES: readonly ObservationEventType[] = [
  "gc",
  "policy",
  "snapshot",
  "fallback",
  "decision",
] as const;

export type ObservationDomainEntry = {
  modules: string[];
  files: string[];
};

export type ObservationDocEntry = {
  code: string[];
  docs: string[];
  tests: string[];
};

export type ImportGraphEntry = {
  imports: string[];
  importedBy: string[];
};

export type ObservationRegistrySnapshot = {
  builtAt: string;
  domains: Record<ObservationDomain, ObservationDomainEntry>;
  docMap: Record<string, ObservationDocEntry>;
  importGraph: Record<string, ImportGraphEntry>;
  domainAliases: Record<string, ObservationDomain>;
  eventTypes: ObservationEventType[];
  smokeTests: string[];
};
