# Selector Hardening Audit Summary

Generated: 2026-07-07T22:33:56.147Z

## Executive Status

| Gate | Status |
|------|--------|
| Import graph (zero broken) | PASS |
| Hot-path circular dependencies | PASS |
| Unknown advisory cycles | PASS |
| Runtime surface stable | PASS |
| Barrel drift < 5% UNUSED | PASS |

**Overall:** PASS

## Metrics

- Broken imports: 0
- Import cycles (total): 4
- Hot-path cycles: 0
- Unknown advisory cycles: 0
- Barrel exports: 249
- Barrel UNUSED: 0 (0%)
- Barrel USED: 249
- Barrel RISKY: 0
- Dead code candidates (confidence >= 60): 8

## SAFE ACTIONS

- Run: npx tsx scripts/selector-rebuild-observation-registry.ts

## DO NOT TOUCH

- `lib/selector-core/selector-decision-engine.ts` — runtime/build contract or offline script dependency
- `lib/selector-core/selector-config-runtime-loader.ts` — runtime/build contract or offline script dependency
- `lib/selector-core/selector-explainability.ts` — runtime/build contract or offline script dependency
- `lib/selector-core/selector-enforcement-ruleset.ts` — runtime/build contract or offline script dependency
- `lib/selector-core/selector-build-orchestrator.ts` — runtime/build contract or offline script dependency
- `lib/selector-core/selector-adaptive-analyzer.ts` — runtime/build contract or offline script dependency
- `lib/selector-core/selector-ab-simulator.ts` — runtime/build contract or offline script dependency
- `lib/selector-core/selector-insight-promotion-engine.ts` — runtime/build contract or offline script dependency

## Dead Code Candidates (report only — do not auto-delete)

| Confidence | Symbol | File | Reason |
|------------|--------|------|--------|
| 95 | ObservationDomainEntry | lib/selector-core/selector-observation-types.ts | zero_repo_references |
| 95 | ImportGraphEntry | lib/selector-core/selector-observation-types.ts | zero_repo_references |
| 95 | validatePostApplyOutcome | lib/selector-core/selector-post-apply-validator.ts | zero_repo_references |
| 95 | countEventsByDomain | lib/selector-core/selector-post-apply-validator.ts | zero_repo_references |
| 72 | LEGACY_SELECTOR_ADAPTER_PHASE | lib/selector-core/legacy-selector-adapters.ts | script_or_test_only |
| 72 | ResolveSelectorSuggestionsInput | lib/selector-core/resolve-selector-suggestions.ts | script_or_test_only |
| 72 | validatePostApplyOutcomes | lib/selector-core/selector-post-apply-validator.ts | script_or_test_only |
| 72 | summarizeValidationResults | lib/selector-core/selector-post-apply-validator.ts | script_or_test_only |

## Runtime Surface

- **SelectorDecisionEngine**: stable @ `lib/selector-core/selector-decision-engine.ts`
- **loadLatestSelectorSnapshot**: stable @ `lib/selector-core/selector-config-runtime-loader.ts`
- **resolveSelectorEngineConfig**: stable @ `lib/selector-core/selector-config-runtime-loader.ts`
- **getExplanation**: stable @ `lib/selector-core/selector-explainability.ts`
