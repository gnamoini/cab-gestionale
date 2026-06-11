export const MAP_VERSION = 1 as const;
export const CLASSIFIER_SCHEMA_VERSION = "v1" as const;
export const ELIGIBILITY_SCHEMA_VERSION = "v1" as const;

export const MAP_SEMANTIC_SCHEMA = {
  mapVersion: MAP_VERSION,
  classifierSchemaVersion: CLASSIFIER_SCHEMA_VERSION,
  eligibilitySchemaVersion: ELIGIBILITY_SCHEMA_VERSION,
  tierBands: ["0", "0B", "1", "2", "3"],
  invariants: [
    "classification_pure_no_temporal",
    "eligibility_never_mutates_tier",
    "decision_orchestrator_composes_layers",
  ],
} as const;

export type MapCompatibilityStatus = "CURRENT" | "LEGACY" | "FUTURE_INCOMPATIBLE";

export type MapVersionContext = typeof MAP_SEMANTIC_SCHEMA;

const KNOWN_CLASSIFIER_SCHEMAS = new Set<string>([CLASSIFIER_SCHEMA_VERSION]);
const KNOWN_ELIGIBILITY_SCHEMAS = new Set<string>([ELIGIBILITY_SCHEMA_VERSION]);

export function resolveMapVersionContext(): MapVersionContext {
  return MAP_SEMANTIC_SCHEMA;
}

/** Coarse compatibility — true when input MAP version is readable by the runtime version. */
export function isCompatibleMapVersion(
  inputVersion: number,
  runtimeVersion: number,
): boolean {
  return inputVersion <= runtimeVersion;
}

export function resolveCompatibilityStatus(input: {
  mapVersion: number;
  classifierSchemaVersion: string;
  eligibilitySchemaVersion: string;
  evaluatedAgainstMapVersion: number;
  runtime?: MapVersionContext;
}): MapCompatibilityStatus {
  const runtime = input.runtime ?? resolveMapVersionContext();

  if (
    input.mapVersion > runtime.mapVersion ||
    input.evaluatedAgainstMapVersion > runtime.mapVersion
  ) {
    return "FUTURE_INCOMPATIBLE";
  }

  if (
    !KNOWN_CLASSIFIER_SCHEMAS.has(input.classifierSchemaVersion) ||
    !KNOWN_ELIGIBILITY_SCHEMAS.has(input.eligibilitySchemaVersion)
  ) {
    return "FUTURE_INCOMPATIBLE";
  }

  if (
    input.mapVersion === runtime.mapVersion &&
    input.evaluatedAgainstMapVersion === runtime.mapVersion &&
    input.classifierSchemaVersion === runtime.classifierSchemaVersion &&
    input.eligibilitySchemaVersion === runtime.eligibilitySchemaVersion
  ) {
    return "CURRENT";
  }

  if (
    input.mapVersion < runtime.mapVersion ||
    input.evaluatedAgainstMapVersion < runtime.mapVersion
  ) {
    return "LEGACY";
  }

  return "LEGACY";
}
