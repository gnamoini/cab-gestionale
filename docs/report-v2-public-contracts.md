# Report V2 — Public Contract Inventory

SSOT for public Report V2 contracts, versioning, observability events, and governance gate chain.

## Contract inventory

| Contratto | Versione | SSOT | Snapshot test |
|-----------|----------|------|---------------|
| Dataset Payload | `2.0` | `lib/report/contracts/` | `test-results/report-v2-sprint1-contract-snapshot.json` |
| Executive DTO | `1` | `lib/report/executive/types.ts` | `test-results/report-v2-executive-contract-snapshot.json` |
| Executive Card | `1` | `lib/report/executive/types.ts` | idem (per-card `contractVersion` for independent card rendering) |
| Cross DTO | `1` | `lib/report/cross-analysis/types.ts` | `test-results/report-v2-cross-contract-snapshot.json` |
| Cross numeric parity | precision `6` | `lib/report/cross-analysis/types.ts` (`CROSS_NUMERIC_PRECISION`) | `cross-parity.test.ts` |
| DrillDown | — | `lib/report/contracts/drill-down-contract.ts` | runtime assert |
| Metric Registry | lifecycle Sprint 0 | `lib/report/metrics/report-metric-registry.ts` | registry tests |
| `CanonicalMetricId` | derived from registry | `lib/report/metrics/report-metric-registry.ts` | derived-metric-catalog tests |
| Derived Projection | metadata only | `lib/report/metrics/derived-metric-catalog.ts` | factory-validated |
| Analytics Bundle | envelope v1 | `lib/report/analytics/analytics-dataset-bundle.ts` | bundle tests |
| Insight DTO | `1` | `lib/report/insights/types.ts` | `test-results/report-v2-insight-contract-snapshot.json` |
| Insight rule catalog | `1` | `lib/report/insights/registry/` | `test-results/report-v2-insight-rule-catalog-snapshot.json` |
| Insight runtime regression | — | `lib/report/insights/builders/` | `test-results/report-v2-insight-runtime-regression.json` |
| Report AI Context DTO | `1` | `lib/report/ai-context/types.ts` | `ai-context-contract-schema.test.ts` |
| AI context size policy | max 10 insights / 8KB | `lib/report/ai-context/types.ts` | `ai-context-size-budget.test.ts` |
| Narrative Prompt Context | `1` | `lib/report/narrative/types.ts` | `narrative-contract-schema.test.ts` |
| Generated Narrative DTO | `1` | `lib/report/narrative/types.ts` | `narrative-contract-schema.test.ts`, `narrative-provider-output-contract.test.ts` |
| Generated Narrative Content (LLM) | internal | `lib/report/narrative/providers/generated-narrative-content-schema.ts` | `gemini-adapter-contract.test.ts` |
| AI Context API | — | `app/api/report/ai-context/route.ts` | `ai-context-api-contract.test.ts` |
| Insight scoring | frozen | `lib/report/insights/engine/calculate-insight-score.ts` | `insight-ranking-score.test.ts` |
| Observability Events | — | `lib/report/observability/report-metric-observability.ts` | observability tests |
| Trust merge | `RED > AMBER > GREEN` | `lib/report/contracts/merge-trust-status.ts` | merge-trust-status tests |

## Versioning rules

- **Semver on contract version fields** — bump `contractVersion` on breaking shape changes.
- **Snapshot tests** normalize dynamic fields (`generatedAt`, `calculationDurationMs`) to `"<dynamic>"`.
- **Cross DTO**: only `ReportCrossDto` carries `contractVersion`. `CrossMetricDto` items do not — the public contract is the payload envelope, not individual metrics. Executive Card retains per-card version for independent UI card contracts.

## Cross vs Executive versioning

| Layer | `contractVersion` on payload | `contractVersion` on item |
|-------|-------------------------------|---------------------------|
| Executive | `ReportExecutiveDto` | `ExecutiveCardDto` (card is independently renderable) |
| Cross | `ReportCrossDto` | none (`CrossMetricDto` is payload element) |

## Cross DTO v1 freeze (Sprint 3)

**Compatible without version bump:**
- Optional fields on `metadata` envelope
- `warnings` on cross metrics
- Observability payload extensions

**Breaking (requires `CROSS_CONTRACT_VERSION = "2"`):**
- Rename `metrics` or change required `CrossMetricDto` shape
- Remove snapshot-golden fields

## Insight input contract (Sprint 4)

```
AnalyticsDatasetBundle → buildReportCrossDto → Insight Rule Registry → InsightCandidate → enrich/render → InsightDto → API → UI
```

- `reportV2DomainDto` enables cross API only — not React sections
- `reportV2Insights` enables insight API + InsightStrip only
- `reportV2AiContext` enables `GET /api/report/ai-context` only (Sprint 5A)
- Insight engine: **no DB access**, no cross formula recalculation, no HTTP to sibling report APIs

## Insight rule identity

- `ruleKey` — audit-stable (`LAV_OPEN_BACKLOG`)
- `ruleVersion` — decision behavior evolution (threshold, evaluate logic); bump on behavioral change
- `catalogVersion` — catalog set evolution (add/remove `ruleKey`); independent from `ruleVersion`

Example valid state:

```text
catalogVersion: 2
  LAV_OPEN_BACKLOG v1
  MAG_LOW_STOCK    v3
  CROSS_COST_JOB   v1
```

- `InsightCandidate` — analytical fact only (no `message`, no `drillDown`, no `formattedValue`)
- `InsightDto` — public contract (message + drillDown added in enrichment)

### InsightSkipReason (closed union)

```ts
"deferred" | "missing_data" | "trust_blocked" | "condition_false"
```

New skip reasons require contract bump + docs update. Not a free string.

### Catalog hashes (Sprint 4.5)

| Hash | Scope | Bump trigger |
|------|-------|--------------|
| `definitionHash` | severity, priority, metricIds, domain, applicability, requiresTrust | `ruleVersion` |
| `navigationHash` | drillDown.targetSection, targetTab, metricId | UI section refactor only |

Excluded from both: runtime thresholds, messages, payload, `evaluate()` logic.

### Drill-down navigation (UI contract)

InsightStrip and future AI consumers navigate **only** via `DrillDownRef` (`targetSection`, `targetTab`, `metricId`).

**Forbidden:** navigation via `insight.id` or `ruleKey`.

DOM anchor: `#report-section-{targetSection}` (see `report-sections.tsx`).

### AI Context boundary (Sprint 4.5.1)

Three distinct contracts:

```text
InsightCandidate   → decision layer (internal)
InsightDto         → UI consumer (message, drillDown)
ReportAIContextDto → AI consumer (structured signals only)
```

**ReportAIContextDto v1** — [`lib/report/ai-context/types.ts`](lib/report/ai-context/types.ts)

- `AIInsightPayload` wrapper: `{ schemaVersion, values }` — not a free Record
- `AI_CONTEXT_MAX_INSIGHTS = 10`, `AI_CONTEXT_MAX_PAYLOAD_BYTES = 8192`
- Trust: `mergeTrustStatus` on fired signals; **RED allowed** in AI context (marked, not omitted)
- UI strip: RED omitted by `trustFilter` (Sprint 4) — different policy by design

AI Context Builder **MAY** consume:

- `InsightEvaluationResult[]` (fired candidates)
- `InsightTelemetrySummary`
- `mergeTrustStatus`

AI Context Builder **MUST NOT** consume:

- `InsightDto[]` as input (presentation leak)
- Dataset builders / `AnalyticsDatasetBundle` raw slices
- DB clients
- Rule registry `evaluate()` functions

**Future narrative layer (Sprint 5):** MUST depend on `ai-context`; MUST NOT depend on `insight-engine`. MUST NOT consume `InsightDto`.

**Entry checklist:** [`docs/report-v2-sprint5-entry-checklist.md`](report-v2-sprint5-entry-checklist.md)

### Narrative layer boundary (Sprint 5A + 5B)

`lib/report/narrative/**` — lossless projection v1 via `buildNarrativePromptContext(ReportAIContextDto)`.

- `NARRATIVE_PROMPT_CONTEXT_VERSION = "1"`
- `projection ≠ semantic transformation` — v1 maps signals without severity/trust recalculation
- **MUST NOT** contain threshold evaluation, KPI aggregation, metric calculation, severity/trust assignment

**LLM content vs public DTO (Sprint 5B — anti-spoofing):**

| Tipo | Ruolo | Campi server-only |
|------|-------|-------------------|
| `GeneratedNarrativeContent` | output grezzo del modello (Zod interno) | — |
| `GeneratedNarrativeDto` | contratto pubblico arricchito server-side | `generatedAt` (ISO `z.string().datetime()`), `modelMetadata` |

`aiService.generateObject` usa **solo** `generatedNarrativeContentSchema` — mai `generatedNarrativeDtoSchema`.

**Provider boundary (Sprint 5B + 5C quality):**

```text
NarrativePromptContext → GeminiAdapter → GeneratedNarrativeContent
  → validateGeneratedNarrative → validateNarrativeQuality → buildGeneratedNarrativeDto → GeneratedNarrativeDto
```

- `NarrativeLlmProvider` contract: `lib/report/narrative/contracts/narrative-provider.types.ts`
- Default provider: `geminiNarrativeProvider` (`NARRATIVE_PROVIDER_IDS = ["gemini"]`)
- Timeout enforced: `resolveNarrativeProviderTimeoutMs()` → `timeoutMs` su `aiService.generateObject`
- Feature flag: `reportV2Narrative` — **default ON** (emergency rollback switch)
  - Client UI: `NEXT_PUBLIC_REPORT_V2_NARRATIVE` → `resolveReportV2NarrativeEnabledClient()`
  - Server API: `REPORT_V2_NARRATIVE` → `resolveReportV2NarrativeEnabled()`
  - Full rollback: set **both** to `false` (see [`report-v2-narrative-rollout-runbook.md`](report-v2-narrative-rollout-runbook.md))
- Rate limit multi-tenant: `${userId}:${companyId}:report_narrative` — 5 req / 10 min
- Service invoke order: flag → rate limit → `isConfigured()` → `generate()` (no LLM before checks)
- Application helper: `generateNarrativeFromAiContext` (chains builder → `narrativeService`)

**Semantic quality layer (Sprint 5C):**

| Failure code | Significato |
|--------------|-------------|
| `validation_failed` | contratto strutturale (ruleKey, metricIds, JSON) |
| `quality_failed` | formato valido, contenuto non affidabile |

- `extractNumericEvidence()` — whitelist key su `payload.values` (esclude `*Id`, `year`, `version`)
- `validateNarrativeQuality()` — numeric traceability, severity hierarchy (`languageSeverity <= signalSeverity`), trust assertiveness cap, `derived-claim-denylist`
- `NarrativeQualityReport` — telemetry interna (ok + fail); **mai** in `GeneratedNarrativeDto`
- `buildGeneratedNarrativeDto()` raggiungibile **solo** dopo quality PASS

**Fuori scope HTTP in 5C:** nessuna route narrativa; consumer UI/API in Sprint 5D.

**HTTP consumer boundary (Sprint 5D):**

| Endpoint | Auth order | Response |
|----------|------------|----------|
| `GET /api/report/ai-context` | flag-first (read model, intentional endpoint masking) | `ReportAIContextDto` |
| `GET /api/report/narrative` | identity-first: **RBAC → session → flag** | `GeneratedNarrativeDto` + `metadata.source: "narrative-v2"` + `correlationId` |

`correlationId` (UUID) è generato per request e propagato su success **e** error per tracing generation→consumption.

Forbidden keys in narrative API responses: `prompt`, `provider`, `quality`, `claims`, `telemetry`, `checkedClaims`, `rejectedClaims`.

- Handler: [`lib/report/narrative/api/report-narrative-api.ts`](../lib/report/narrative/api/report-narrative-api.ts)
- Route: [`app/api/report/narrative/route.ts`](../app/api/report/narrative/route.ts)
- Shared period builder: [`lib/report/ai-context/build-report-ai-context-for-period.ts`](../lib/report/ai-context/build-report-ai-context-for-period.ts)
- Tenant resolver: [`lib/report/narrative/services/resolve-narrative-tenant-context.ts`](../lib/report/narrative/services/resolve-narrative-tenant-context.ts)
- UI adapter (sole `reportV2Narrative` flag owner): [`lib/report/narrative/use-report-ai-analysis-source.ts`](../lib/report/narrative/use-report-ai-analysis-source.ts)
- UI consumer: [`components/report/layout/report-ai-analysis-zone.tsx`](../components/report/layout/report-ai-analysis-zone.tsx)

**Narrative telemetry (Sprint 5D + 5E rollout):**

| Event | Significato | `consumerPath` |
|-------|-------------|----------------|
| `narrative_generation_completed` | provider + quality PASS | `narrative-v2` |
| `narrative_generation_failed` | provider/validation issue | `narrative-v2` |
| `narrative_quality_failed` | safety rejection | `narrative-v2` |
| `narrative_consumed` | UI ha renderizzato DTO | `narrative-v2` |
| `report_analysis_completed` | legacy analysis OK | `legacy-analysis` |
| `report_analysis_failed` | legacy analysis error | `legacy-analysis` |
| `report_analysis_empty` | legacy validation/empty | `legacy-analysis` |

Rollup: [`narrative-rollout-metrics.ts`](../lib/report/narrative/observability/narrative-rollout-metrics.ts). Runbook: [`report-v2-narrative-rollout-runbook.md`](report-v2-narrative-rollout-runbook.md).

**API:** `GET /api/report/ai-context` → `ReportAIContextDto` in `ReportPayload` envelope. Handler: [`lib/report/ai-context/api/report-ai-context-api.ts`](../lib/report/ai-context/api/report-ai-context-api.ts). Does **not** call `buildNarrativePromptContext` or any LLM provider.

### Legacy vs AI context contracts

| Contratto | Ruolo | Stato |
|----------|-------|-------|
| `ReportAnalysisContext` | aggregazione KPI/trend legacy | legacy |
| `ReportAIContextDto` | segnali decisionali | v1 stabile |
| `NarrativePromptContext` | adapter linguistico (`NARRATIVE_PROMPT_CONTEXT_VERSION = "1"`) | v1 attivo (Sprint 5A) |
| `GeneratedNarrativeDto` | output AI (non autorevole; quality-gated) | Sprint 5D consumer (HTTP + UI) |

Sprint 5 may compose `ReportAnalysisContext` + `ReportAIContextDto` in `NarrativePromptContext`, but must not merge them creatively or substitute one for the other.

## Deprecation policy

- `buildCrossAnalytics` in `lib/report/report-domain-analytics.ts` is **deprecated** (Sprint 3).
- SSOT for cross formulas: `buildReportCrossDto` in `lib/report/cross-analysis/`.
- Removal target: Sprint 4+ after consumer migration.

## Observability events

### Shared payload fields

```ts
consumer: "executive" | "cross-analysis" | "insight" | "narrative"
consumerPath?: "legacy-analysis" | "narrative-v2"
tenantResolved?: boolean
metricId?: string
metricIds?: string[]
trust?: TrustStatus
sourceDatasets?: string[]
executionTimeMs?: number
```

### Executive events

- `executive_payload_generated` — `consumer: "executive"`
- `executive_metric_partial` — partial trust on card
- `executive_contract_violation` — contract assert failure

### Cross events (Sprint 3)

- `cross_payload_generated` — `consumer: "cross-analysis"`
- `cross_metric_partial` — metric trust AMBER
- `cross_contract_violation` — missing metric / invalid input / missing registry

### Insight events (Sprint 4)

- `insight_payload_generated` — `consumer: "insight"`, `ruleKey`, `ruleVersion` (tracing per-rule)
- `insight_rule_skipped` — `reason`: deferred | missing_data | trust_blocked | condition_false (tracing)
- `insight_contract_violation`
- `insight_telemetry_summary` — operational aggregate from runtime (Sprint 4.5)

### Insight telemetry summary (Sprint 4.5)

Derived from runtime (`InsightEvaluationResult[]` + `InsightDto[]`), **not** from event buffer drain.

```ts
{
  totalRules, evaluatedRules, firedRules, skippedRules,
  insightFireRate,    // firedRules / evaluatedRules
  insightSkipRate,    // skippedRules / evaluatedRules
  skipByReason, trustDistribution,
  topInsightRules: { ruleKey, ruleVersion, count }[]
}
```

## Governance gate chain

```
governance.report.v2.semantic-contract
        ↓
governance.report.v2.datasets
        ↓
governance.report.v2.executive-contract
        ↓
governance.report.v2.executive-boundary
        ↓
governance.report.v2.executive-hardening
        ↓
governance.report.v2.executive
        ↓
governance.report.v2.cross-contract      (structure)
        ↓
governance.report.v2.cross-parity          (numeric semantics, precision 6)
        ↓
governance.report.v2.cross-analysis        (API + RBAC + boundary)
        ↓
governance.report.v2.insight-contract      (structure + ruleKey/ruleVersion snapshot)
        ↓
governance.report.v2.insight-rules         (registry 25 P0, deferred, drilldown)
        ↓
governance.report.v2.insight-engine        (candidate≠dto, scoring, ranking, trust)
        ↓
governance.report.v2.insight-analysis      (API + RBAC + boundaries)
        ↓
governance.report.v2.insight-hardening     (telemetry, catalog, performance, regression)
        ↓
governance.report.v2.ai-context            (ReportAIContextDto v1, boundary, size budget)
        ↓
governance.report.v2.narrative-contract    (Sprint 5A — types, builder, API; dependsOn: ai-context)
        ↓
governance.report.v2.narrative-provider    (Sprint 5B — Gemini adapter, flag, rate limit; dependsOn: narrative-contract)
        ↓
governance.report.v2.narrative-quality       (Sprint 5C — semantic quality gate, tier pr blocker; dependsOn: narrative-contract + narrative-provider)
        ↓
governance.report.v2.narrative-consumer      (Sprint 5D — HTTP + UI consumer, tier pr blocker; dependsOn: narrative-provider + narrative-quality)
        ↓
governance.report.v2.narrative-preflight     (Sprint 5E — pre-flight blocker; dependsOn: narrative-consumer)
        ↓
governance.report.v2.narrative-rollout       (Sprint 5E — controlled enablement default ON; dependsOn: narrative-preflight)
```

## Import boundaries

- **Executive**: no registry/dataset imports in `components/report/executive/**` (except hook allowlist).
- **Cross**: no `buildReportCrossDto`, `buildCrossAnalytics`, `@/lib/report/cross-analysis` barrel in `components/**` or `app/**`.
- **Insights**: no `INSIGHT_RULE_REGISTRY`, `evaluateInsightRules`, `buildReportInsightsDto` in `components/**` or `app/**` (hook + DTO types only).
- **Narrative** (Sprint 5): no `insight-engine`, `datasets`, `metrics` imports in `lib/report/narrative/**`; no `InsightDto` as AI input. See [`report-v2-sprint5-entry-checklist.md`](report-v2-sprint5-entry-checklist.md).
