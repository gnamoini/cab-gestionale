/** @generated v6.3 — self-healing observation registry; do not edit manually */
import type { ObservationRegistrySnapshot } from "@/lib/selector-core/selector-observation-types";

export const OBSERVATION_REGISTRY_SNAPSHOT: ObservationRegistrySnapshot = {
  "builtAt": "2026-09-01T02:24:50.516Z",
  "domains": {
    "runtime": {
      "modules": [
        "selector-ab-simulator",
        "selector-adaptive-analyzer",
        "selector-adaptive-rules",
        "selector-api-surface-registry",
        "selector-architecture-time-machine",
        "selector-cognitive-surface-metrics",
        "selector-confidence-model",
        "selector-config-promotion-registry",
        "selector-config-runtime-loader",
        "selector-config-snapshot",
        "selector-decision-engine",
        "selector-decision-trace",
        "selector-determinism-gate",
        "selector-determinism-gate-audit",
        "selector-domain-policy",
        "selector-engine-config",
        "selector-explanation-kernel",
        "selector-hard-guardrails",
        "selector-insight-promotion-engine",
        "selector-post-apply-validator",
        "selector-rank",
        "selector-recents-store",
        "selector-runtime-context-snapshot",
        "selector-runtime-sanity-guard",
        "selector-runtime-version-resolver",
        "selector-safe-fallback",
        "selector-system-canonical-artifacts",
        "selector-telemetry",
        "selector-telemetry-aggregator",
        "selector-telemetry-bridge",
        "selector-thresholds",
        "selector-usage-scan"
      ],
      "files": [
        "lib/selector-core/selector-ab-simulator.ts",
        "lib/selector-core/selector-adaptive-analyzer.ts",
        "lib/selector-core/selector-adaptive-rules.ts",
        "lib/selector-core/selector-api-surface-registry.ts",
        "lib/selector-core/selector-architecture-time-machine.ts",
        "lib/selector-core/selector-cognitive-surface-metrics.ts",
        "lib/selector-core/selector-confidence-model.ts",
        "lib/selector-core/selector-config-promotion-registry.ts",
        "lib/selector-core/selector-config-runtime-loader.ts",
        "lib/selector-core/selector-config-snapshot.ts",
        "lib/selector-core/selector-decision-engine.ts",
        "lib/selector-core/selector-decision-trace.ts",
        "lib/selector-core/selector-determinism-gate-audit.ts",
        "lib/selector-core/selector-determinism-gate.ts",
        "lib/selector-core/selector-domain-policy.ts",
        "lib/selector-core/selector-engine-config.ts",
        "lib/selector-core/selector-explanation-kernel.ts",
        "lib/selector-core/selector-hard-guardrails.ts",
        "lib/selector-core/selector-insight-promotion-engine.ts",
        "lib/selector-core/selector-post-apply-validator.ts",
        "lib/selector-core/selector-rank.ts",
        "lib/selector-core/selector-recents-store.ts",
        "lib/selector-core/selector-runtime-context-snapshot.ts",
        "lib/selector-core/selector-runtime-sanity-guard.ts",
        "lib/selector-core/selector-runtime-version-resolver.ts",
        "lib/selector-core/selector-safe-fallback.ts",
        "lib/selector-core/selector-system-canonical-artifacts.ts",
        "lib/selector-core/selector-telemetry-aggregator.ts",
        "lib/selector-core/selector-telemetry-bridge.ts",
        "lib/selector-core/selector-telemetry.ts",
        "lib/selector-core/selector-thresholds.ts",
        "lib/selector-core/selector-usage-scan.ts"
      ]
    },
    "policy": {
      "modules": [
        "selector-api-enforcer-report",
        "selector-api-usage-enforcer",
        "selector-config-enforcer",
        "selector-enforcement-boundary-guard",
        "selector-enforcement-ruleset"
      ],
      "files": [
        "lib/selector-core/selector-api-enforcer-report.ts",
        "lib/selector-core/selector-api-usage-enforcer.ts",
        "lib/selector-core/selector-config-enforcer.ts",
        "lib/selector-core/selector-enforcement-boundary-guard.ts",
        "lib/selector-core/selector-enforcement-ruleset.ts"
      ]
    },
    "snapshot": {
      "modules": [
        "selector-bundle-registry-consistency-check",
        "selector-distributed-pointer-guard",
        "selector-runtime-snapshot-revalidator",
        "selector-snapshot-atomic-switch",
        "selector-snapshot-bundle-sync",
        "selector-snapshot-lifecycle-manager",
        "selector-snapshot-pruner",
        "selector-snapshot-registry",
        "selector-snapshot-schema-validator",
        "selector-snapshot-semantic-validator",
        "selector-unified-snapshot-index"
      ],
      "files": [
        "lib/selector-core/selector-bundle-registry-consistency-check.ts",
        "lib/selector-core/selector-distributed-pointer-guard.ts",
        "lib/selector-core/selector-runtime-snapshot-revalidator.ts",
        "lib/selector-core/selector-snapshot-atomic-switch.ts",
        "lib/selector-core/selector-snapshot-bundle-sync.ts",
        "lib/selector-core/selector-snapshot-lifecycle-manager.ts",
        "lib/selector-core/selector-snapshot-pruner.ts",
        "lib/selector-core/selector-snapshot-registry.ts",
        "lib/selector-core/selector-snapshot-schema-validator.ts",
        "lib/selector-core/selector-snapshot-semantic-validator.ts",
        "lib/selector-core/selector-unified-snapshot-index.ts"
      ]
    },
    "explainability": {
      "modules": [
        "selector-causal-model-interface",
        "selector-causal-semantic-router",
        "selector-core-causal-model",
        "selector-explainability"
      ],
      "files": [
        "lib/selector-core/selector-causal-model-interface.ts",
        "lib/selector-core/selector-causal-semantic-router.ts",
        "lib/selector-core/selector-core-causal-model.ts",
        "lib/selector-core/selector-explainability.ts"
      ]
    },
    "gc": {
      "modules": [
        "selector-snapshot-gc-policy"
      ],
      "files": [
        "lib/selector-core/selector-snapshot-gc-policy.ts"
      ]
    },
    "build": {
      "modules": [
        "selector-build-dependency-guard",
        "selector-build-orchestrator",
        "selector-debug-dsl-engine",
        "selector-debug-dsl-registry",
        "selector-debug-observation",
        "selector-distributed-checkpoint-manager",
        "selector-observation-ranking-engine",
        "selector-observation-registry",
        "selector-observation-registry-builder",
        "selector-observation-types"
      ],
      "files": [
        "lib/selector-core/selector-build-dependency-guard.ts",
        "lib/selector-core/selector-build-orchestrator.ts",
        "lib/selector-core/selector-debug-dsl-engine.ts",
        "lib/selector-core/selector-debug-dsl-registry.ts",
        "lib/selector-core/selector-debug-observation.ts",
        "lib/selector-core/selector-distributed-checkpoint-manager.ts",
        "lib/selector-core/selector-observation-ranking-engine.ts",
        "lib/selector-core/selector-observation-registry-builder.ts",
        "lib/selector-core/selector-observation-registry.ts",
        "lib/selector-core/selector-observation-types.ts"
      ]
    },
    "fallback": {
      "modules": [
        "selector-fallback-trace"
      ],
      "files": [
        "lib/selector-core/selector-fallback-trace.ts"
      ]
    }
  },
  "docMap": {
    "Runtime": {
      "code": [
        "lib/selector-core/selector-ab-simulator.ts",
        "lib/selector-core/selector-adaptive-analyzer.ts",
        "lib/selector-core/selector-adaptive-rules.ts",
        "lib/selector-core/selector-api-surface-registry.ts",
        "lib/selector-core/selector-architecture-time-machine.ts",
        "lib/selector-core/selector-cognitive-surface-metrics.ts",
        "lib/selector-core/selector-confidence-model.ts",
        "lib/selector-core/selector-config-promotion-registry.ts",
        "lib/selector-core/selector-config-runtime-loader.ts",
        "lib/selector-core/selector-config-snapshot.ts",
        "lib/selector-core/selector-decision-engine.ts",
        "lib/selector-core/selector-decision-trace.ts",
        "lib/selector-core/selector-determinism-gate-audit.ts",
        "lib/selector-core/selector-determinism-gate.ts",
        "lib/selector-core/selector-domain-policy.ts",
        "lib/selector-core/selector-engine-config.ts",
        "lib/selector-core/selector-explanation-kernel.ts",
        "lib/selector-core/selector-hard-guardrails.ts",
        "lib/selector-core/selector-insight-promotion-engine.ts",
        "lib/selector-core/selector-post-apply-validator.ts",
        "lib/selector-core/selector-rank.ts",
        "lib/selector-core/selector-recents-store.ts",
        "lib/selector-core/selector-runtime-context-snapshot.ts",
        "lib/selector-core/selector-runtime-sanity-guard.ts",
        "lib/selector-core/selector-runtime-version-resolver.ts",
        "lib/selector-core/selector-safe-fallback.ts",
        "lib/selector-core/selector-system-canonical-artifacts.ts",
        "lib/selector-core/selector-telemetry-aggregator.ts",
        "lib/selector-core/selector-telemetry-bridge.ts",
        "lib/selector-core/selector-telemetry.ts",
        "lib/selector-core/selector-thresholds.ts",
        "lib/selector-core/selector-usage-scan.ts"
      ],
      "docs": [
        "docs/selector-usage-baseline.md"
      ],
      "tests": [
        "lib/regression/selector-adaptive-audit.test.ts",
        "lib/regression/selector-decision-engine-audit.test.ts",
        "lib/regression/selector-snapshot-v57-stability-freeze.test.ts"
      ]
    },
    "Policy": {
      "code": [
        "lib/selector-core/selector-api-enforcer-report.ts",
        "lib/selector-core/selector-api-usage-enforcer.ts",
        "lib/selector-core/selector-config-enforcer.ts",
        "lib/selector-core/selector-enforcement-boundary-guard.ts",
        "lib/selector-core/selector-enforcement-ruleset.ts"
      ],
      "docs": [
        "docs/selector-post-change-validation.md"
      ],
      "tests": [
        "lib/regression/selector-domain-policy-audit.test.ts",
        "lib/regression/selector-snapshot-v58-policy-decoupling.test.ts",
        "lib/regression/selector-snapshot-v59-policy-runtime-convergence.test.ts",
        "lib/regression/selector-snapshot-v60-kernel-collapse.test.ts"
      ]
    },
    "Snapshot": {
      "code": [
        "lib/selector-core/generated/selector-active-pointer.json",
        "lib/selector-core/generated/selector-bundle-manifest.json",
        "lib/selector-core/generated/selector-rollback-registry.generated.ts",
        "lib/selector-core/generated/selector-snapshot-registry.generated.ts",
        "lib/selector-core/selector-bundle-registry-consistency-check.ts",
        "lib/selector-core/selector-distributed-pointer-guard.ts",
        "lib/selector-core/selector-runtime-snapshot-revalidator.ts",
        "lib/selector-core/selector-snapshot-atomic-switch.ts",
        "lib/selector-core/selector-snapshot-bundle-sync.ts",
        "lib/selector-core/selector-snapshot-lifecycle-manager.ts",
        "lib/selector-core/selector-snapshot-pruner.ts",
        "lib/selector-core/selector-snapshot-registry.ts",
        "lib/selector-core/selector-snapshot-schema-validator.ts",
        "lib/selector-core/selector-snapshot-semantic-validator.ts",
        "lib/selector-core/selector-unified-snapshot-index.ts"
      ],
      "docs": [
        "docs/selector-adaptive-insights.json",
        "docs/selector/snapshots/manifest.json",
        "docs/selector/snapshots/v0.json"
      ],
      "tests": [
        "lib/regression/selector-snapshot-architecture-invariants.test.ts",
        "lib/regression/selector-snapshot-consistency.test.ts",
        "lib/regression/selector-snapshot-hardening-smoke.test.ts",
        "lib/regression/selector-snapshot-production.test.ts",
        "lib/regression/selector-snapshot-v57-stability-freeze.test.ts",
        "lib/regression/selector-snapshot-v58-policy-decoupling.test.ts",
        "lib/regression/selector-snapshot-v59-policy-runtime-convergence.test.ts",
        "lib/regression/selector-snapshot-v60-kernel-collapse.test.ts",
        "lib/regression/selector-snapshot-v62-observation-debug-dsl.test.ts",
        "lib/regression/selector-snapshot-v63-self-healing-registry.test.ts"
      ]
    },
    "Explainability": {
      "code": [
        "lib/selector-core/selector-causal-model-interface.ts",
        "lib/selector-core/selector-causal-semantic-router.ts",
        "lib/selector-core/selector-core-causal-model.ts",
        "lib/selector-core/selector-explainability.ts"
      ],
      "docs": [
        "docs/selector-usage-baseline.md"
      ],
      "tests": [
        "lib/regression/selector-snapshot-v57-stability-freeze.test.ts"
      ]
    },
    "GC": {
      "code": [
        "lib/selector-core/selector-snapshot-gc-policy.ts"
      ],
      "docs": [],
      "tests": []
    },
    "Build": {
      "code": [
        "lib/selector-core/selector-build-dependency-guard.ts",
        "lib/selector-core/selector-build-orchestrator.ts",
        "lib/selector-core/selector-debug-dsl-engine.ts",
        "lib/selector-core/selector-debug-dsl-registry.ts",
        "lib/selector-core/selector-debug-observation.ts",
        "lib/selector-core/selector-distributed-checkpoint-manager.ts",
        "lib/selector-core/selector-observation-ranking-engine.ts",
        "lib/selector-core/selector-observation-registry-builder.ts",
        "lib/selector-core/selector-observation-registry.ts",
        "lib/selector-core/selector-observation-types.ts"
      ],
      "docs": [
        "docs/selector-adaptive-insights.json"
      ],
      "tests": [
        "lib/regression/selector-snapshot-v60-kernel-collapse.test.ts",
        "lib/regression/selector-snapshot-v62-observation-debug-dsl.test.ts",
        "lib/regression/selector-snapshot-v63-self-healing-registry.test.ts"
      ]
    },
    "Fallback": {
      "code": [
        "lib/selector-core/selector-fallback-trace.ts"
      ],
      "docs": [],
      "tests": []
    }
  },
  "importGraph": {
    "lib/selector-core/selector-ab-simulator.ts": {
      "imports": [
        "lib/selector-core/selector-engine-config.ts",
        "lib/selector-core/selector-telemetry.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-engine-config.ts": {
      "imports": [
        "lib/selector-core/selector-config-runtime-loader.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-safe-fallback.ts",
        "lib/selector-core/selector-telemetry.ts",
        "lib/selector-core/selector-thresholds.ts"
      ]
    },
    "lib/selector-core/selector-telemetry.ts": {
      "imports": [
        "lib/selector-core/selector-engine-config.ts",
        "lib/selector-core/selector-thresholds.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-adaptive-analyzer.ts": {
      "imports": [
        "lib/selector-core/selector-adaptive-rules.ts",
        "lib/selector-core/selector-telemetry-aggregator.ts",
        "lib/selector-core/selector-telemetry.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-adaptive-rules.ts": {
      "imports": [
        "lib/selector-core/selector-telemetry-aggregator.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-telemetry-aggregator.ts": {
      "imports": [
        "lib/selector-core/selector-telemetry.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-api-enforcer-report.ts": {
      "imports": [
        "lib/selector-core/selector-api-surface-registry.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-api-usage-enforcer.ts",
        "lib/selector-core/selector-build-orchestrator.ts",
        "lib/selector-core/selector-enforcement-ruleset.ts",
        "lib/selector-core/selector-system-canonical-artifacts.ts"
      ]
    },
    "lib/selector-core/selector-api-surface-registry.ts": {
      "imports": [
        "lib/selector-core/selector-enforcement-ruleset.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-enforcement-ruleset.ts": {
      "imports": [
        "lib/selector-core/selector-api-enforcer-report.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-system-canonical-artifacts.ts"
      ]
    },
    "lib/selector-core/selector-api-usage-enforcer.ts": {
      "imports": [
        "lib/selector-core/selector-api-enforcer-report.ts",
        "lib/selector-core/selector-enforcement-ruleset.ts",
        "lib/selector-core/selector-system-canonical-artifacts.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-build-orchestrator.ts"
      ]
    },
    "lib/selector-core/selector-system-canonical-artifacts.ts": {
      "imports": [
        "lib/selector-core/selector-api-enforcer-report.ts",
        "lib/selector-core/selector-enforcement-ruleset.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-architecture-time-machine.ts": {
      "imports": [
        "lib/selector-core/selector-core-causal-model.ts",
        "lib/selector-core/selector-enforcement-ruleset.ts",
        "lib/selector-core/selector-snapshot-registry.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-debug-dsl-engine.ts"
      ]
    },
    "lib/selector-core/selector-snapshot-registry.ts": {
      "imports": [
        "lib/selector-core/selector-config-snapshot.ts",
        "lib/selector-core/selector-snapshot-atomic-switch.ts",
        "lib/selector-core/selector-snapshot-bundle-sync.ts",
        "lib/selector-core/selector-snapshot-schema-validator.ts",
        "lib/selector-core/selector-snapshot-semantic-validator.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-core-causal-model.ts": {
      "imports": [
        "lib/selector-core/selector-decision-trace.ts",
        "lib/selector-core/selector-runtime-context-snapshot.ts",
        "lib/selector-core/selector-snapshot-lifecycle-manager.ts",
        "lib/selector-core/selector-snapshot-pruner.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-explainability.ts",
        "lib/selector-core/selector-snapshot-gc-policy.ts"
      ]
    },
    "lib/selector-core/selector-build-dependency-guard.ts": {
      "imports": [
        "lib/selector-core/selector-bundle-registry-consistency-check.ts",
        "lib/selector-core/selector-snapshot-atomic-switch.ts",
        "lib/selector-core/selector-snapshot-pruner.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-build-orchestrator.ts"
      ]
    },
    "lib/selector-core/selector-snapshot-atomic-switch.ts": {
      "imports": [
        "lib/selector-core/selector-distributed-pointer-guard.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-snapshot-bundle-sync.ts",
        "lib/selector-core/selector-snapshot-registry.ts"
      ]
    },
    "lib/selector-core/selector-bundle-registry-consistency-check.ts": {
      "imports": [
        "lib/selector-core/selector-snapshot-atomic-switch.ts",
        "lib/selector-core/selector-snapshot-schema-validator.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-snapshot-bundle-sync.ts"
      ]
    },
    "lib/selector-core/selector-snapshot-pruner.ts": {
      "imports": [
        "lib/selector-core/selector-snapshot-lifecycle-manager.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-build-orchestrator.ts": {
      "imports": [
        "lib/selector-core/selector-api-enforcer-report.ts",
        "lib/selector-core/selector-api-usage-enforcer.ts",
        "lib/selector-core/selector-build-dependency-guard.ts",
        "lib/selector-core/selector-bundle-registry-consistency-check.ts",
        "lib/selector-core/selector-debug-observation.ts",
        "lib/selector-core/selector-determinism-gate-audit.ts",
        "lib/selector-core/selector-determinism-gate.ts",
        "lib/selector-core/selector-distributed-checkpoint-manager.ts",
        "lib/selector-core/selector-distributed-pointer-guard.ts",
        "lib/selector-core/selector-enforcement-ruleset.ts",
        "lib/selector-core/selector-snapshot-atomic-switch.ts",
        "lib/selector-core/selector-snapshot-bundle-sync.ts",
        "lib/selector-core/selector-snapshot-gc-policy.ts",
        "lib/selector-core/selector-snapshot-lifecycle-manager.ts",
        "lib/selector-core/selector-snapshot-pruner.ts",
        "lib/selector-core/selector-snapshot-registry.ts",
        "lib/selector-core/selector-snapshot-schema-validator.ts",
        "lib/selector-core/selector-snapshot-semantic-validator.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-distributed-checkpoint-manager.ts": {
      "imports": [
        "lib/selector-core/selector-snapshot-atomic-switch.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-distributed-pointer-guard.ts": {
      "imports": [],
      "importedBy": [
        "lib/selector-core/selector-snapshot-atomic-switch.ts"
      ]
    },
    "lib/selector-core/selector-snapshot-bundle-sync.ts": {
      "imports": [
        "lib/selector-core/selector-bundle-registry-consistency-check.ts",
        "lib/selector-core/selector-snapshot-atomic-switch.ts",
        "lib/selector-core/selector-snapshot-lifecycle-manager.ts",
        "lib/selector-core/selector-snapshot-pruner.ts",
        "lib/selector-core/selector-snapshot-registry.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-snapshot-registry.ts"
      ]
    },
    "lib/selector-core/selector-snapshot-lifecycle-manager.ts": {
      "imports": [
        "lib/selector-core/selector-snapshot-pruner.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-snapshot-pruner.ts"
      ]
    },
    "lib/selector-core/selector-snapshot-gc-policy.ts": {
      "imports": [
        "lib/selector-core/selector-core-causal-model.ts",
        "lib/selector-core/selector-snapshot-lifecycle-manager.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-snapshot-semantic-validator.ts": {
      "imports": [
        "lib/selector-core/selector-config-snapshot.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-snapshot-schema-validator.ts": {
      "imports": [],
      "importedBy": [
        "lib/selector-core/selector-unified-snapshot-index.ts"
      ]
    },
    "lib/selector-core/selector-determinism-gate-audit.ts": {
      "imports": [
        "lib/selector-core/selector-determinism-gate.ts",
        "lib/selector-core/selector-distributed-checkpoint-manager.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-determinism-gate.ts": {
      "imports": [
        "lib/selector-core/selector-runtime-context-snapshot.ts",
        "lib/selector-core/selector-unified-snapshot-index.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-debug-observation.ts": {
      "imports": [],
      "importedBy": []
    },
    "lib/selector-core/selector-causal-model-interface.ts": {
      "imports": [
        "lib/selector-core/selector-core-causal-model.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-causal-semantic-router.ts",
        "lib/selector-core/selector-explainability.ts"
      ]
    },
    "lib/selector-core/selector-causal-semantic-router.ts": {
      "imports": [
        "lib/selector-core/selector-causal-model-interface.ts",
        "lib/selector-core/selector-core-causal-model.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-cognitive-surface-metrics.ts",
        "lib/selector-core/selector-explainability.ts"
      ]
    },
    "lib/selector-core/selector-cognitive-surface-metrics.ts": {
      "imports": [
        "lib/selector-core/selector-causal-semantic-router.ts",
        "lib/selector-core/selector-core-causal-model.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-confidence-model.ts": {
      "imports": [],
      "importedBy": [
        "lib/selector-core/selector-insight-promotion-engine.ts"
      ]
    },
    "lib/selector-core/selector-config-enforcer.ts": {
      "imports": [
        "lib/selector-core/selector-config-promotion-registry.ts",
        "lib/selector-core/selector-config-snapshot.ts",
        "lib/selector-core/selector-snapshot-atomic-switch.ts",
        "lib/selector-core/selector-snapshot-bundle-sync.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-config-snapshot.ts": {
      "imports": [],
      "importedBy": [
        "lib/selector-core/selector-explainability.ts",
        "lib/selector-core/selector-fallback-trace.ts",
        "lib/selector-core/selector-runtime-sanity-guard.ts",
        "lib/selector-core/selector-runtime-snapshot-revalidator.ts",
        "lib/selector-core/selector-runtime-version-resolver.ts",
        "lib/selector-core/selector-snapshot-registry.ts",
        "lib/selector-core/selector-snapshot-semantic-validator.ts"
      ]
    },
    "lib/selector-core/selector-config-promotion-registry.ts": {
      "imports": [],
      "importedBy": []
    },
    "lib/selector-core/selector-config-runtime-loader.ts": {
      "imports": [
        "lib/selector-core/selector-active-pointer.json.ts",
        "lib/selector-core/selector-bundle-manifest.json.ts",
        "lib/selector-core/selector-config-snapshot.ts",
        "lib/selector-core/selector-determinism-gate.ts",
        "lib/selector-core/selector-distributed-pointer-guard.ts",
        "lib/selector-core/selector-fallback-trace.ts",
        "lib/selector-core/selector-rollback-registry.generated.ts",
        "lib/selector-core/selector-runtime-context-snapshot.ts",
        "lib/selector-core/selector-runtime-sanity-guard.ts",
        "lib/selector-core/selector-runtime-snapshot-revalidator.ts",
        "lib/selector-core/selector-runtime-version-resolver.ts",
        "lib/selector-core/selector-snapshot-registry.generated.ts",
        "lib/selector-core/selector-snapshot-schema-validator.ts",
        "lib/selector-core/selector-unified-snapshot-index.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-decision-engine.ts",
        "lib/selector-core/selector-engine-config.ts"
      ]
    },
    "lib/selector-core/selector-fallback-trace.ts": {
      "imports": [
        "lib/selector-core/selector-config-snapshot.ts",
        "lib/selector-core/selector-runtime-sanity-guard.ts",
        "lib/selector-core/selector-snapshot-schema-validator.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-runtime-context-snapshot.ts": {
      "imports": [
        "lib/selector-core/selector-snapshot-schema-validator.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-runtime-sanity-guard.ts": {
      "imports": [
        "lib/selector-core/selector-config-snapshot.ts",
        "lib/selector-core/selector-runtime-snapshot-revalidator.ts",
        "lib/selector-core/selector-runtime-version-resolver.ts",
        "lib/selector-core/selector-snapshot-schema-validator.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-runtime-snapshot-revalidator.ts"
      ]
    },
    "lib/selector-core/selector-runtime-snapshot-revalidator.ts": {
      "imports": [
        "lib/selector-core/selector-config-snapshot.ts",
        "lib/selector-core/selector-runtime-sanity-guard.ts",
        "lib/selector-core/selector-snapshot-schema-validator.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-runtime-version-resolver.ts": {
      "imports": [
        "lib/selector-core/selector-config-snapshot.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-unified-snapshot-index.ts": {
      "imports": [
        "lib/selector-core/selector-snapshot-schema-validator.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-active-pointer.json.ts": {
      "imports": [],
      "importedBy": [
        "lib/selector-core/selector-config-runtime-loader.ts"
      ]
    },
    "lib/selector-core/selector-bundle-manifest.json.ts": {
      "imports": [],
      "importedBy": [
        "lib/selector-core/selector-config-runtime-loader.ts"
      ]
    },
    "lib/selector-core/selector-snapshot-registry.generated.ts": {
      "imports": [],
      "importedBy": [
        "lib/selector-core/selector-config-runtime-loader.ts"
      ]
    },
    "lib/selector-core/selector-rollback-registry.generated.ts": {
      "imports": [],
      "importedBy": [
        "lib/selector-core/selector-config-runtime-loader.ts"
      ]
    },
    "lib/selector-core/selector-decision-trace.ts": {
      "imports": [
        "lib/selector-core/selector-engine-config.ts",
        "lib/selector-core/selector-fallback-trace.ts",
        "lib/selector-core/selector-runtime-context-snapshot.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-explainability.ts",
        "lib/selector-core/selector-telemetry-bridge.ts"
      ]
    },
    "lib/selector-core/selector-debug-dsl-engine.ts": {
      "imports": [
        "lib/selector-core/selector-architecture-time-machine.ts",
        "lib/selector-core/selector-debug-dsl-registry.ts",
        "lib/selector-core/selector-explanation-kernel.ts",
        "lib/selector-core/selector-observation-ranking-engine.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-debug-dsl-registry.ts": {
      "imports": [],
      "importedBy": []
    },
    "lib/selector-core/selector-explanation-kernel.ts": {
      "imports": [
        "lib/selector-core/selector-observation-ranking-engine.ts",
        "lib/selector-core/selector-observation-registry.ts",
        "lib/selector-core/selector-observation-types.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-observation-ranking-engine.ts": {
      "imports": [
        "lib/selector-core/selector-observation-registry.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-decision-engine.ts": {
      "imports": [
        "lib/selector-core/selector-config-runtime-loader.ts",
        "lib/selector-core/selector-engine-config.ts",
        "lib/selector-core/selector-fallback-trace.ts",
        "lib/selector-core/selector-safe-fallback.ts",
        "lib/selector-core/selector-telemetry-bridge.ts",
        "lib/selector-core/selector-thresholds.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-domain-policy.ts"
      ]
    },
    "lib/selector-core/selector-telemetry-bridge.ts": {
      "imports": [
        "lib/selector-core/selector-decision-trace.ts",
        "lib/selector-core/selector-telemetry.ts",
        "lib/selector-core/selector-thresholds.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-safe-fallback.ts": {
      "imports": [
        "lib/selector-core/selector-engine-config.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-thresholds.ts": {
      "imports": [
        "lib/selector-core/selector-engine-config.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-domain-policy.ts": {
      "imports": [
        "lib/selector-core/selector-decision-engine.ts",
        "lib/selector-core/selector-engine-config.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-enforcement-boundary-guard.ts": {
      "imports": [],
      "importedBy": []
    },
    "lib/selector-core/selector-explainability.ts": {
      "imports": [
        "lib/selector-core/selector-causal-model-interface.ts",
        "lib/selector-core/selector-causal-semantic-router.ts",
        "lib/selector-core/selector-config-snapshot.ts",
        "lib/selector-core/selector-core-causal-model.ts",
        "lib/selector-core/selector-decision-trace.ts",
        "lib/selector-core/selector-fallback-trace.ts",
        "lib/selector-core/selector-runtime-context-snapshot.ts",
        "lib/selector-core/selector-snapshot-gc-policy.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-observation-registry.ts": {
      "imports": [
        "lib/selector-core/selector-observation-registry-builder.ts",
        "lib/selector-core/selector-observation-registry.generated.ts",
        "lib/selector-core/selector-observation-types.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-observation-types.ts": {
      "imports": [],
      "importedBy": []
    },
    "lib/selector-core/selector-hard-guardrails.ts": {
      "imports": [],
      "importedBy": []
    },
    "lib/selector-core/selector-insight-promotion-engine.ts": {
      "imports": [
        "lib/selector-core/selector-confidence-model.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-observation-registry-builder.ts": {
      "imports": [
        "lib/selector-core/selector-observation-types.ts"
      ],
      "importedBy": [
        "lib/selector-core/selector-observation-registry.ts"
      ]
    },
    "lib/selector-core/selector-observation-registry.generated.ts": {
      "imports": [],
      "importedBy": [
        "lib/selector-core/selector-observation-registry.ts"
      ]
    },
    "lib/selector-core/selector-post-apply-validator.ts": {
      "imports": [
        "lib/selector-core/selector-telemetry-aggregator.ts",
        "lib/selector-core/selector-telemetry.ts"
      ],
      "importedBy": []
    },
    "lib/selector-core/selector-rank.ts": {
      "imports": [],
      "importedBy": []
    },
    "lib/selector-core/selector-recents-store.ts": {
      "imports": [],
      "importedBy": []
    },
    "lib/selector-core/selector-usage-scan.ts": {
      "imports": [],
      "importedBy": []
    }
  },
  "domainAliases": {
    "gc": "gc",
    "policy": "policy",
    "convergence": "policy",
    "ruleset": "policy",
    "snapshot": "snapshot",
    "snapshots": "snapshot",
    "runtime": "runtime",
    "decision": "runtime",
    "engine": "runtime",
    "explainability": "explainability",
    "explain": "explainability",
    "fallback": "fallback",
    "build": "build",
    "orchestrator": "build"
  },
  "eventTypes": [
    "gc",
    "policy",
    "snapshot",
    "fallback",
    "decision"
  ],
  "smokeTests": [
    "lib/regression/selector-adaptive-audit.test.ts",
    "lib/regression/selector-concurrency-race.test.ts",
    "lib/regression/selector-decision-engine-audit.test.ts",
    "lib/regression/selector-domain-policy-audit.test.ts",
    "lib/regression/selector-exclusive-group.test.ts",
    "lib/regression/selector-ghost-click-guard.test.ts",
    "lib/regression/selector-hardening-audit.test.ts",
    "lib/regression/selector-post-change-validation.test.ts",
    "lib/regression/selector-query-ssot-audit.test.ts",
    "lib/regression/selector-rollout-safety-audit.test.ts",
    "lib/regression/selector-scroll-restoration-audit.test.ts",
    "lib/regression/selector-selection-atomicity.test.ts",
    "lib/regression/selector-sheet-tap-select.test.ts",
    "lib/regression/selector-snapshot-architecture-invariants.test.ts",
    "lib/regression/selector-snapshot-consistency.test.ts",
    "lib/regression/selector-snapshot-hardening-smoke.test.ts",
    "lib/regression/selector-snapshot-production.test.ts",
    "lib/regression/selector-snapshot-v57-stability-freeze.test.ts",
    "lib/regression/selector-snapshot-v58-policy-decoupling.test.ts",
    "lib/regression/selector-snapshot-v59-policy-runtime-convergence.test.ts",
    "lib/regression/selector-snapshot-v60-kernel-collapse.test.ts",
    "lib/regression/selector-snapshot-v62-observation-debug-dsl.test.ts",
    "lib/regression/selector-snapshot-v63-self-healing-registry.test.ts",
    "lib/regression/selector-usage-scan.test.ts"
  ]
};
