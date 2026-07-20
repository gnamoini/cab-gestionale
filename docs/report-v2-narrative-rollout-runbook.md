# Report V2 Narrative — Rollout Runbook

Controlled enablement: Narrative V2 is **default ON**. Legacy analysis remains available via emergency kill switch (no code deploy).

## Normal path

```text
ReportAiAnalysisZone → useReportAiAnalysisSource → narrative-v2 → GET /api/report/narrative
```

## Emergency rollback (no code deploy)

Set both environment variables:

```bash
REPORT_V2_NARRATIVE=false
NEXT_PUBLIC_REPORT_V2_NARRATIVE=false
```

Redeploy or refresh runtime env (Vercel: Production env vars → redeploy).

### Effect

```text
ReportAiAnalysisZone → useReportAiAnalysisSource → legacy → POST /api/report/analysis
GET /api/report/narrative → 404
```

### Verification checklist

- [ ] UI shows legacy "Genera analisi" flow (manual generate)
- [ ] Network tab: no `GET /api/report/narrative`
- [ ] `POST /api/report/analysis` works for authorized users
- [ ] `report_analysis_*` telemetry events resume (`consumerPath: legacy-analysis`)

### Partial rollback (not recommended)

| Env | Effect |
|-----|--------|
| `REPORT_V2_NARRATIVE=false` only | API 404; UI may still call narrative if client flag ON |
| `NEXT_PUBLIC_REPORT_V2_NARRATIVE=false` only | UI legacy; API still reachable if server flag ON |

**Always set both** for full rollback.

## Flag SSOT

| Surface | Env var | Default |
|---------|---------|---------|
| Server (API) | `REPORT_V2_NARRATIVE` | `true` |
| Client (UI) | `NEXT_PUBLIC_REPORT_V2_NARRATIVE` | `true` |

Resolution order: **ENV → DB (future) → DEFAULT**

## Telemetry

| Event | `consumerPath` |
|-------|----------------|
| `narrative_generation_*` | `narrative-v2` |
| `narrative_consumed` | `narrative-v2` |
| `report_analysis_*` | `legacy-analysis` |

Rollup helpers: `lib/report/narrative/observability/narrative-rollout-metrics.ts`

Health check (observe): `npx tsx scripts/control/narrative-rollout-health.ts`

## Rollback criteria

| Condition | Action |
|-----------|--------|
| Narrative error rate > legacy baseline + 5pp | Full kill switch |
| `not_configured` / timeout spike | Kill switch + verify Gemini keys |
| `quality_failed` anomaly | Investigate (no auto-off) |
| API 5xx on `/api/report/narrative` | Full kill switch |
| UX regression | Full kill switch |

## Provider readiness

- Gemini keys: `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_API_KEY`, or `GOOGLE_API_KEY`
- Timeout: `resolveNarrativeProviderTimeoutMs()` in narrative provider policy
- Failover: `lib/ai/runtime/service.ts` (key rotation)

Verify: `npx tsx scripts/check-production-config.ts`

## Governance chain

```text
narrative-consumer → narrative-preflight → narrative-rollout
```
