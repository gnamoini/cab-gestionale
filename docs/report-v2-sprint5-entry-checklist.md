# Report V2 — Sprint 5 Entry Checklist

**Stato:** operational freeze (pre-Sprint 5)  
**Prerequisito:** `governance.report.v2.ai-context` PASS (Sprint 4.5.1)  
**SSOT contratti:** [`report-v2-public-contracts.md`](report-v2-public-contracts.md)

---

## Scopo

Checklist operativa che Sprint 5 deve rispettare **prima** di scrivere codice provider/Gemini.

**Non** è uno Sprint 4.6. Zero modifiche al decision layer già stabilizzato.

---

## Architettura consolidata

```text
Analytics Dataset
      ↓
Cross DTO
      ↓
Insight Engine
      ↓
InsightCandidate
      ├───────────────┐
      ↓               ↓
InsightDto       ReportAIContextDto
      ↓               ↓
InsightStrip     Narrative Layer
```

### Regola critica

Il Narrative Layer **MUST NOT** consumare `InsightDto`.

| Contratto | Ruolo | Consumer |
|-----------|-------|----------|
| `InsightDto` | presentazione UI (message, drillDown, ranking visuale) | InsightStrip |
| `ReportAIContextDto` | segnali semantici strutturati (ruleKey, severity, trust, payload) | Narrative Layer |

Motivazione: evitare che il modello AI dipenda da testo già renderizzato, drill-down UI, policy di esposizione frontend.

---

## 1. Import boundary (narrative layer)

**Path:** `lib/report/narrative/**`

### MAY import

- `lib/report/ai-context/**`
- `lib/report/contracts/**`
- `lib/report/observability/**` (telemetry events, non engine internals)
- `lib/report/narrative/types.ts` (self)

### MUST NOT import

- `lib/report/insights/rules/**`
- `lib/report/insights/engine/**`
- `lib/report/datasets/**`
- `lib/report/metrics/**` (calculators, registry evaluate paths)
- Supabase / DB clients

### Test previsto (Sprint 5)

`lib/report/narrative/__tests__/narrative-import-boundary.test.ts` — stesso pattern grep-based di [`ai-context-input-boundary.test.ts`](../lib/report/ai-context/__tests__/ai-context-input-boundary.test.ts).

---

## 2. Narrative layer MUST NOT become a second decision engine

`lib/report/narrative/**` **MUST NOT** contain:

- threshold evaluation
- KPI aggregation
- metric calculation
- severity assignment
- trust calculation

### Rischio da bloccare

```text
AI Context → Gemini → "vedo backlog alto" → nuova severity
```

Il narrative layer fa `facts → explanation`, non `facts → new facts`.

---

## 3. Contratto narrativo (ordine obbligatorio)

```text
ReportAIContextDto
        ↓
NarrativePromptContext      ← contratto versionato (no prompt string come SSOT)
        ↓
ProviderAdapter             ← Gemini, sostituibile
        ↓
GeneratedNarrativeDto       ← output validato, non autorevole
```

**Vietato:** `ReportAIContextDto → Gemini prompt string` come contratto pubblico.

### Versioning

```ts
export const NARRATIVE_PROMPT_CONTEXT_VERSION = "1";
```

Il prompt context è il vero contratto tra dati disponibili, istruzioni narrative e provider.

### NarrativePromptContext — responsabilità

**MAY:**

- selezionare segnali da `ReportAIContextDto`
- ordinare informazioni per il provider
- preparare contesto linguistico strutturato

**MUST NOT:**

- calcolare metriche
- filtrare/cambiare severity
- correggere dati o trust
- contenere interpretazioni pre-inferenza (`interpretation: "La produzione è inefficiente"`)

Esempio corretto:

```ts
{ signal: "LAV_OPEN_BACKLOG", value: 24, severity: "warning" }
```

### GeneratedNarrativeDto — output non autorevole

`GeneratedNarrativeDto` is **explanatory only**.

**MUST NOT become:**

- source of truth
- input for calculations
- input for alerts
- input for health score

Ciclo chiuso: `facts → explanation`, non `facts → new facts`.

---

## 4. Legacy migration table

| Contratto | Ruolo | Stato |
|----------|-------|-------|
| `ReportAnalysisContext` | aggregazione KPI/trend legacy | legacy |
| `ReportAIContextDto` | segnali decisionali | v1 stabile |
| `NarrativePromptContext` | adapter linguistico | Sprint 5 |
| `GeneratedNarrativeDto` | output AI | Sprint 5 |

Sprint 5 **può comporre** `ReportAnalysisContext` + `ReportAIContextDto` in `NarrativePromptContext`, ma:

- boundary insight resta su `ai-context`
- nessun "merge creativo" che sostituisce uno con l'altro
- `InsightDto` resta escluso dal flusso AI

Legacy SSOT: [`lib/report/report-analysis/`](../lib/report/report-analysis/) (`ReportAnalysisContext`, `ReportAnalysisOutput`).

---

## 5. Trust divergence (formalizzata)

| Consumer | RED policy | Rationale |
|----------|-----------|-----------|
| UI (`InsightStrip`) | omit | decisioni operative affidabili |
| AI (`ReportAIContextDto`) | include + marked | spiegare limiti dati, non inventare |

Policy già implementata in Sprint 4 (UI) e Sprint 4.5.1 (AI). Il narrative layer eredita i segnali da `ReportAIContextDto` — non ridefinisce trust.

---

## 6. Size budget ereditato

Il narrative layer **MUST NOT** espandere oltre i limiti già nel contratto AI context:

- `AI_CONTEXT_MAX_INSIGHTS = 10`
- `AI_CONTEXT_MAX_PAYLOAD_BYTES = 8192`

Token/latency control è responsabilità del `NarrativePromptContext` builder, non del decision layer.

---

## 7. Governance gate chain (Sprint 5)

```text
ai-context              ← DONE (Sprint 4.5.1)
        ↓
narrative-contract      ← types + schema + presentation-leak + no-decision-logic
        ↓
narrative-provider      ← dependsOn: narrative-contract
        ↓
narrative-quality       ← dependsOn: narrative-contract + narrative-provider
```

### Invarianti narrative-quality

- AI non modifica KPI numerici
- AI non modifica `severity` / `ruleKey` / `metricIds` dei segnali input
- AI non inventa metriche assenti da `ReportAIContextDto`
- Output mantiene riferimenti `metricId` / `ruleKey` tracciabili
- `GeneratedNarrativeDto` non contiene KPI derivati

---

## 8. Pre-flight checklist

### Day-1

- [x] `governance.report.v2.ai-context` PASS
- [x] `NarrativePromptContext v1` + `buildNarrativePromptContext` (lossless projection)
- [x] `GET /api/report/ai-context` — `ReportAIContextDto`, no Gemini
- [x] `governance.report.v2.narrative-contract` gate registered
- [x] Nessun import `insight-engine` / `datasets` / `metrics` in `lib/report/narrative/**` (core layer; provider in `providers/`)
- [x] `NarrativePromptContext` tipizzato con `contractVersion` prima di qualsiasi chiamata provider
- [x] `GeneratedNarrativeDto` con Zod + `contractVersion` (schema only)
- [x] Test presentation-leak / no-enrichment su prompt context
- [x] Feature flag `reportV2AiContext` wired in API handler
- [x] Legacy `report-analysis` migration path documentato (tabella contratti §4)

### Aggiuntive

- [x] `NarrativePromptContext` ha `contractVersion` (`NARRATIVE_PROMPT_CONTEXT_VERSION`)
- [x] Provider adapter sostituibile senza cambiare DTO (no provider in 5A)
- [x] Nessuna chiamata LLM nei builder di contesto (`buildNarrativePromptContext` è sync/puro)

---

## 9. Sprint 5 split (5A / 5B / 5C)

Evitare `route → Gemini` nello stesso sprint iniziale.

### Sprint 5A — Contracts + API

- `GET /api/report/ai-context` — espone `ReportAIContextDto`, **non** invoca Gemini
- Narrative contracts (`types.ts`, `NarrativePromptContext`, `GeneratedNarrativeDto`)
- Gate: `governance.report.v2.narrative-contract`

### Sprint 5B — Provider

- `GeminiAdapter` (`geminiNarrativeProvider`) — provider-specific, sostituibile
- `GeneratedNarrativeContent` (LLM schema) separato da `GeneratedNarrativeDto` (server-enriched)
- `validateGeneratedNarrative` — ruleKey/metricIds subset, no duplicate ruleKey
- `narrativeService` — flag → rate limit → configured → generate
- Feature flag `reportV2Narrative` + rate limit `${userId}:${companyId}:report_narrative`
- Gate: `governance.report.v2.narrative-provider` (`dependsOn: narrative-contract`)

#### Sprint 5B pre-flight (DONE)

- [x] `GeneratedNarrativeContent` schema interno (no `generatedAt` / `modelMetadata`)
- [x] `GeneratedNarrativeDto` con `generatedAt: z.string().datetime()` + `modelMetadata`
- [x] `NarrativeLlmProvider` contract + `NARRATIVE_PROVIDER_IDS`
- [x] `geminiNarrativeProvider` — timeout enforced via `resolveNarrativeProviderTimeoutMs()`
- [x] `validateGeneratedNarrative` — duplicate `ruleKey` reject
- [x] `narrativeService` invoke order (flag → rate limit → configured → generate)
- [x] `reportV2Narrative` flag wired
- [x] Rate limit multi-tenant key
- [x] `governance.report.v2.narrative-provider` gate registered
- [x] Zero diff `lib/report/report-analysis/`, insight engine, `GET /api/report/ai-context`
- [x] Nessuna route HTTP narrativa (5C)

### Sprint 5C — Quality

- `validateNarrativeQuality` — numeric traceability, severity/trust hierarchy, derived-claim denylist
- `quality_failed` vs `validation_failed` — failure domain separati
- `NarrativeQualityReport` — telemetry interna (mai in DTO)
- Gate: `governance.report.v2.narrative-quality` (`tier: pr`, `severity: blocker`, `dependsOn: narrative-contract + narrative-provider`)

#### Sprint 5C pre-flight (DONE)

- [x] `extractNumericEvidence()` whitelist key (no `machineId`/`year` accidentali)
- [x] `validateNarrativeQuality` dopo structural, prima di `buildGeneratedNarrativeDto`
- [x] Severity hierarchy enum (`languageSeverity <= signalSeverity`)
- [x] Trust assertiveness cap (RED/AMBER/GREEN)
- [x] `derived-claim-denylist` (non solo KPI)
- [x] `NarrativeQualityReport.failureCode?` su fail; telemetry ok+fail
- [x] `narrative-quality-report-internal.test.ts` — no exposure in DTO
- [x] `governance.report.v2.narrative-quality` gate registered
- [x] Nessuna route HTTP / UI (5D)

### Sprint 5D — HTTP + UI consumer (DONE)

- `GET /api/report/narrative` — `GeneratedNarrativeDto` in `ReportPayload`; auth order **RBAC → session → flag**
- `POST /api/report/narrative/consumed` — `narrative_consumed` telemetry (dedupe server + client `useRef`)
- Shared builder: `buildReportAIContextForPeriod()` — zero semantic diff vs inline ai-context handler
- Tenant: `resolveNarrativeTenantContext()` — `tenantResolved` when `companyId !== "unknown"` (never `"default"`)
- `correlationId` — UUID per request, success + error responses
- Consumer adapter: `useReportAiAnalysisSource()` — sole owner of `reportV2Narrative` flag
- UI: `ReportAiAnalysisZone` — narrative-v2 replaces legacy `useReportAnalysis` when flag ON
- Forbidden response keys: `prompt`, `provider`, `quality`, `claims`, `telemetry`, `checkedClaims`, `rejectedClaims`
- Gate: `governance.report.v2.narrative-consumer` (`tier: pr`, `severity: blocker`, `dependsOn: narrative-provider + narrative-quality`)

#### Sprint 5D pre-flight (DONE)

- [x] Contract freeze + ADR auth order (`ai-context` flag-first vs `narrative` identity-first)
- [x] `buildReportAIContextForPeriod` extraction + equivalence test
- [x] `resolveNarrativeTenantContext` + `tenantResolved`
- [x] `handleReportNarrativeGet` + route + correlationId
- [x] `useReportNarrative` + `useReportAiAnalysisSource` (sole flag owner)
- [x] `ReportAiAnalysisZone` via adapter only
- [x] Telemetry: `narrative_generation_*`, `narrative_quality_failed`, `narrative_consumed`
- [x] 9 boundary/contract tests + `governance.report.v2.narrative-consumer` gate registered

### Sprint 5E — Rollout + controlled enablement (DONE)

- `reportV2Narrative` **default ON** — safety switch, not rollout switch
- Split SSOT: `REPORT_V2_NARRATIVE` (server) + `NEXT_PUBLIC_REPORT_V2_NARRATIVE` (client)
- Pre-flight gate: `governance.report.v2.narrative-preflight` (before flip)
- Rollout gate: `governance.report.v2.narrative-rollout`
- Telemetry `consumerPath`: `legacy-analysis` | `narrative-v2`
- Rollup metrics: `narrative-rollout-metrics.ts` (P95, error rates)
- Kill-switch tests: `report-v2-kill-switch.integration.test.ts`
- Runbook: `docs/report-v2-narrative-rollout-runbook.md`

#### Sprint 5E pre-flight (DONE)

- [x] Flag resolution server + client SSOT
- [x] Tenant resolver active
- [x] Gemini readiness (provider policy + adapter contract)
- [x] Rate limit contract test
- [x] Telemetry pipeline (`consumerPath`, `tenantResolved`)
- [x] Rollback path verification (kill-switch integration)
- [x] `governance.report.v2.narrative-preflight` registered

#### Sprint 5E rollout (DONE)

- [x] Default ON without env vars
- [x] Legacy telemetry baseline (`report_analysis_*`)
- [x] Narrative rollout metrics + health script
- [x] Emergency rollback runbook (both env vars)
- [x] `governance.report.v2.narrative-rollout` registered

### Post-Sprint 5E

- Legacy retirement decision (future)

---

## Fuori scope (questo freeze)

- Implementazione `lib/report/narrative/**`
- Chiamate Gemini / provider setup
- Registry entries per narrative gates (solo documentati come planned)
- Modifiche insight engine, rules, InsightStrip, ai-context builder
