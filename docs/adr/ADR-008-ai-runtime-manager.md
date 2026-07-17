# ADR-008: AI Runtime Manager v2 + Configuration Store

## Status

Accepted — 2026-07-17

Supersedes [ADR-007](./ADR-007-gemini-env-runtime-resolution.md) for runtime configuration.

## Context

Production errors (`CONFIG_NOT_FOUND` / «Chiave Gemini assente nel runtime») exposed an architectural class of failures:

- API keys as Vercel Sensitive env vars (redeploy to rotate, fragile resolution)
- Gemini-specific scattered clients
- No persistent health/stats across serverless instances
- No admin UI for key management

RCA: [AI_CONFIGURATION_RCA_REPORT.md](../investigation/AI_CONFIGURATION_RCA_REPORT.md) appendice v2.

## Decision

### Two-layer configuration

| Layer | Storage | Contents |
|-------|---------|----------|
| Bootstrap | Vercel env | `AI_MASTER_KEY_ENCRYPTION_KEY`, Supabase service creds, optional legacy env fallback |
| Runtime | Supabase `ai_provider_keys` | Encrypted keys, priority, weight, status, stats, cooldown |

### Code SSOT

- `lib/ai/runtime/service.ts` — **only** entry for features (`generateText`, `generateObject`, `analyzeDocument`, `extractData`)
- `lib/ai/runtime/env-reader.ts` — only `Reflect.get` for bootstrap env
- Provider SDK (`@ai-sdk/google`) only in `lib/ai/runtime/providers/google.ts`

### Hybrid fallback

1. Load keys from DB (primary)
2. If DB empty + `AI_RUNTIME_BOOTSTRAP_FALLBACK_ENABLED` → `syncRuntimeConfigToDatabase()` once (cold start)
3. Cron `/api/cron/ai-runtime-sync` — sync primario (non su hot path AI)
4. If DB unreachable → legacy env keys (degraded mode, logged)

### Diagnostics

- `GET /api/ops/ai-runtime-debug` — raw env probe (no Gemini code), permanent troubleshooting tool
- Ops + admin APIs for key health/test
- UI: `/impostazioni/ai-providers`

### Error codes

Typed: `AI_CONFIG_MISSING`, `AI_KEY_INVALID`, `AI_RATE_LIMIT`, `AI_QUOTA_EXCEEDED`, `AI_PROVIDER_DOWN`, `AI_TIMEOUT`, `AI_UNKNOWN_ERROR`

## Consequences

- Adding a key: admin UI or DB insert — **no code change**, no env var proliferation
- Rotation: disable old key in UI, add new — cooldown/stats in DB
- Regression: `lib/regression/ai-runtime-ssot.test.ts` blocks direct env/SDK access outside runtime
- Deploy gate: bootstrap env (`GOOGLE_GENERATIVE_AI_API_KEY` or `AI_MASTER_KEY_ENCRYPTION_KEY`) at CI; full config validated post-deploy via ops endpoints

## Migration

All AI modules migrated to `aiService`. Legacy `lib/ai/gemini-*.ts` retained as deprecated shims until soak complete.
