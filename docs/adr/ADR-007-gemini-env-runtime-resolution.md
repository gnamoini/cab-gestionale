# ADR-007: Gemini env runtime resolution

## Status

Accepted — 2026-07-17

## Context

Vercel **Sensitive** env vars are not available at Next.js build time. Static `process.env.GOOGLE_*` access can inline `undefined`. Keys added post-deploy without redeploy also break production while local `.env.local` works.

## Decision

1. **SSOT:** `lib/ai/gemini-api-keys.ts` — dynamic `Object.entries(process.env)` scan for primary + secondary keys.
2. **Status model:** `getGeminiConfigurationStatus()` exposes `configured`, `formatValid`, `reachable`, `primarySource`, `modelId`.
3. **Format check:** `AIza…` valid; `AQ.*` / `test` / short keys → `formatValid: false` (warning, not silent success).
4. **Health check:** `POST /api/ops/ai-configuration/test` (admin RBAC `sicurezza` write) — minimal `generateText("ok")`, 10s timeout, no persistence.
5. **Read-only status:** `GET /api/ops/ai-configuration` — no network call.
6. **Deploy gate:** `validateProductionEnv` blocker if `!configured` on production target; `check-production-config` script for Production/Preview/Development key presence (Vercel env pull).

## Analyze errors

| Code | HTTP | Meaning |
|------|------|---------|
| `not_configured` | 503 | No API key |
| `auth_invalid` | 502 | Key rejected |
| `unreachable` | 503 | Network / service down |

## Redeploy rule

After changing Sensitive Gemini keys on Vercel → **redeploy required** (runtime reads env, but stale bundles with inlined undefined must be replaced).

## Consequences

- Failover unchanged: primary → `GEMINI_API_KEY_SECONDARY`.
- `reachable` is `null` until admin runs POST test post-deploy.
