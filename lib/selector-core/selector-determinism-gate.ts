/**
 * @advisory v5.5 — unified determinism gate (pre-resolution + strict + semantic).
 * Build-time complexity audit lives in selector-determinism-gate-audit.ts (Node/fs only).
 */
import type { SelectorRuntimeContext } from "@/lib/selector-core/selector-runtime-context-snapshot";
import {
  isVersionAvailable,
  type SnapshotAvailabilityEntry,
} from "@/lib/selector-core/selector-unified-snapshot-index";
import type { SelectorSnapshotPointer } from "@/lib/selector-core/types";

export type PreResolutionInput = {
  pointer: SelectorSnapshotPointer;
  manifestPointerEpoch?: {
    activeVersion: string;
    previousVersion: string;
    updatedAt: number;
  };
  expectedVersion: string;
  availabilityMap: Record<string, SnapshotAvailabilityEntry>;
  cachedPointerEpoch?: number;
};

export type PreResolutionResult = {
  blocked: boolean;
  reconcileRequired: boolean;
  driftDetectedAtSelection: boolean;
  reasons: string[];
  useFallbackChain: boolean;
};

export type DeterminismValidationResult = {
  isValid: boolean;
  driftScore: number;
  explanation: string[];
};

export type DeterminismDriftRiskLevel = "low" | "medium" | "high";

export type DeterminismIntegrityResult = {
  isStrictlyDeterministic: boolean;
  isSemanticallyDeterministic: boolean;
  driftRiskLevel: DeterminismDriftRiskLevel;
  reasons: string[];
};

export type ComplexityAuditResult = {
  complexityScore: number;
  redundancyMap: Record<string, string[]>;
  collapseSuggestions: string[];
};

const POINTER_EPOCH_WINDOW_MS = 1000;

export function assertPreResolutionConsistency(
  input: PreResolutionInput,
): PreResolutionResult {
  const reasons: string[] = [];
  let blocked = false;
  let reconcileRequired = false;
  let driftDetectedAtSelection = false;

  if (input.manifestPointerEpoch) {
    if (input.pointer.updatedAt !== input.manifestPointerEpoch.updatedAt) {
      reasons.push(
        `pointerEpoch mismatch: pointer=${input.pointer.updatedAt} manifest=${input.manifestPointerEpoch.updatedAt}`,
      );
      blocked = true;
      reconcileRequired = true;
      driftDetectedAtSelection = true;
    }
    if (input.pointer.activeVersion !== input.manifestPointerEpoch.activeVersion) {
      reasons.push(
        `activeVersion mismatch: pointer=${input.pointer.activeVersion} manifest=${input.manifestPointerEpoch.activeVersion}`,
      );
      blocked = true;
      reconcileRequired = true;
      driftDetectedAtSelection = true;
    }
    if (input.pointer.previousVersion !== input.manifestPointerEpoch.previousVersion) {
      reasons.push(
        `previousVersion mismatch: pointer=${input.pointer.previousVersion} manifest=${input.manifestPointerEpoch.previousVersion}`,
      );
      reconcileRequired = true;
      driftDetectedAtSelection = true;
    }
  }

  if (
    typeof input.cachedPointerEpoch === "number" &&
    input.manifestPointerEpoch &&
    input.cachedPointerEpoch !== input.manifestPointerEpoch.updatedAt
  ) {
    reasons.push("stale_runtime_cache_epoch");
    reconcileRequired = true;
    driftDetectedAtSelection = true;
  }

  if (!isVersionAvailable(input.expectedVersion, input.availabilityMap)) {
    reasons.push(`expectedVersion ${input.expectedVersion} not in availability map`);
    blocked = true;
  }

  const useFallbackChain = blocked || driftDetectedAtSelection;

  if (
    useFallbackChain &&
    typeof process !== "undefined" &&
    (process.env.SELECTOR_TELEMETRY_DEBUG === "true" || process.env.NODE_ENV === "development")
  ) {
    console.warn("[selector-determinism-gate]", reasons.join("; "));
  }

  return {
    blocked,
    reconcileRequired,
    driftDetectedAtSelection,
    reasons,
    useFallbackChain,
  };
}

export function validateDeterminism(input: {
  runtimeContext?: SelectorRuntimeContext;
  livePointerEpoch: number;
  liveRegistryHash: string;
  liveContextHash?: string;
  preResolution: PreResolutionResult;
}): DeterminismValidationResult {
  const explanation: string[] = [];
  let driftScore = 0;

  if (
    input.runtimeContext &&
    input.runtimeContext.pointerEpoch !== input.livePointerEpoch
  ) {
    driftScore += 40;
    explanation.push(
      `pointerEpoch drift: captured=${input.runtimeContext.pointerEpoch} live=${input.livePointerEpoch}`,
    );
  }

  if (
    input.runtimeContext &&
    input.runtimeContext.registryHash !== input.liveRegistryHash
  ) {
    driftScore += 40;
    explanation.push("registryHash mismatch vs captured runtime context");
  }

  if (
    input.liveContextHash &&
    input.runtimeContext &&
    input.runtimeContext.contextHash !== input.liveContextHash
  ) {
    driftScore += 15;
    explanation.push("contextHash mismatch vs captured runtime context");
  }

  if (input.preResolution.blocked) {
    driftScore += 20;
    explanation.push(
      ...input.preResolution.reasons.filter(
        (r) => r.includes("mismatch") || r.includes("not in"),
      ),
    );
  }

  if (input.preResolution.reconcileRequired) {
    driftScore += 10;
    explanation.push("reconcileRequired flagged by pre-resolution guard");
  }

  driftScore = Math.min(100, driftScore);

  return {
    isValid: driftScore === 0,
    driftScore,
    explanation,
  };
}

function parseEnvClass(fingerprint: string): { nodeEnv: string; selectorFlags: string } {
  try {
    const raw = Buffer.from(fingerprint, "hex").toString("utf8");
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      return {
        nodeEnv: parsed.NODE_ENV ?? "",
        selectorFlags: [
          parsed.SELECTOR_DECISION_TRACE,
          parsed.SELECTOR_TELEMETRY_DEBUG,
          parsed.SELECTOR_SECURITY_GRADUAL,
          parsed.SELECTOR_SHEET_SEARCHABLE,
          parsed.SELECTOR_DASHBOARD_FILTERS_SHEET,
        ].join("|"),
      };
    }
  } catch {
    /* fingerprint is hash, not raw env */
  }
  return { nodeEnv: "", selectorFlags: fingerprint.slice(0, 16) };
}

function envFingerprintSemanticallyCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.slice(0, 16) === b.slice(0, 16)) return true;
  const classA = parseEnvClass(a);
  const classB = parseEnvClass(b);
  return classA.nodeEnv === classB.nodeEnv && classA.selectorFlags === classB.selectorFlags;
}

function registryHashSemanticallyCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 16 && b.length >= 16 && a.slice(0, 16) === b.slice(0, 16)) return true;
  return false;
}

function pointerEpochSemanticallyAligned(a: number, b: number): boolean {
  return Math.abs(a - b) <= POINTER_EPOCH_WINDOW_MS;
}

export function compareDeterminismContexts(
  a: SelectorRuntimeContext,
  b: SelectorRuntimeContext,
): DeterminismIntegrityResult {
  const reasons: string[] = [];

  const registryStrict = a.registryHash === b.registryHash;
  const pointerStrict = a.pointerEpoch === b.pointerEpoch;
  const envStrict = a.envFingerprint === b.envFingerprint;
  const contextStrict = a.contextHash === b.contextHash;

  const isStrictlyDeterministic =
    registryStrict && pointerStrict && envStrict && contextStrict;

  if (!registryStrict) reasons.push("registryHash strict mismatch");
  if (!pointerStrict) {
    reasons.push(`pointerEpoch strict mismatch: ${a.pointerEpoch} vs ${b.pointerEpoch}`);
  }
  if (!envStrict) reasons.push("envFingerprint strict mismatch");
  if (!contextStrict) reasons.push("contextHash strict mismatch");

  const registrySemantic = registryHashSemanticallyCompatible(a.registryHash, b.registryHash);
  const pointerSemantic = pointerEpochSemanticallyAligned(a.pointerEpoch, b.pointerEpoch);
  const envSemantic = envFingerprintSemanticallyCompatible(a.envFingerprint, b.envFingerprint);

  const isSemanticallyDeterministic =
    registrySemantic && pointerSemantic && envSemantic;

  if (!registrySemantic) reasons.push("registryHash semantic incompatibility");
  if (!pointerSemantic) reasons.push("pointerEpoch outside alignment window");
  if (!envSemantic) reasons.push("envFingerprint semantic class mismatch");

  let driftRiskLevel: DeterminismDriftRiskLevel = "low";
  if (!registrySemantic || !pointerSemantic) {
    driftRiskLevel = "high";
  } else if (!envSemantic) {
    driftRiskLevel = "medium";
  } else if (!isStrictlyDeterministic) {
    driftRiskLevel = "low";
  }

  return {
    isStrictlyDeterministic,
    isSemanticallyDeterministic,
    driftRiskLevel,
    reasons: [...new Set(reasons)],
  };
}

export function evaluateDeterminismGate(input: {
  preResolution: PreResolutionInput;
  strict?: Parameters<typeof validateDeterminism>[0];
  semantic?: { a: SelectorRuntimeContext; b: SelectorRuntimeContext };
}): {
  preResolution: PreResolutionResult;
  strict?: DeterminismValidationResult;
  semantic?: DeterminismIntegrityResult;
} {
  const preResolution = assertPreResolutionConsistency(input.preResolution);
  const strict = input.strict
    ? validateDeterminism({ ...input.strict, preResolution })
    : undefined;
  const semantic = input.semantic
    ? compareDeterminismContexts(input.semantic.a, input.semantic.b)
    : undefined;
  return { preResolution, strict, semantic };
}
