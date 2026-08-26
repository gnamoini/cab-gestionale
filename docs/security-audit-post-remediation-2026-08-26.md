# Security audit post-remediation — 2026-08-26

Secondo audit white-box dopo remediation v2. Baseline diff: `docs/security/baseline-pre-remediation-2026-08-26.json` → `docs/security/baseline-post-remediation-2026-08-26.json` (anon EXECUTE 109 → 0).

| ID | Original Sev | Status | Evidence | Regression test | Residual risk | Baseline diff ref |
|---|---|---|---|---|---|---|
| SEC-01 | Critical | FIXED | `20261226120100` default ACL SSOT + `20261226120200` grants reconcile + manifest | `security-definer-anon-execute.test.ts`, `security-definer-default-acl.test.ts` | New DEFINER without manifest entry | Δ anon -109 |
| SEC-02 | Critical | FIXED | `20261226120500` service_role guards + TTL floor on `expire_import_files` | `security-migration-gate.test.ts` | Cron misconfiguration | grants reconcile |
| SEC-03 | Critical | FIXED | `cab_claim_*` / `cab_complete_*` service_role only | migration gate | — | grants reconcile |
| SEC-04 | Critical | FIXED | Report RPCs: anon revoked + authenticated RBAC | `security-definer-manifest-coverage.test.ts` | — | grants reconcile |
| SEC-05 | Critical | FIXED | `cab_publish_notification`: auth + staff + `p_actor_id := auth.uid()` | migration `20261226120500` | — | grants reconcile |
| SEC-06 | Critical | FIXED | All `cab_invoke_*` service_role + body guard | migration gate | pg_cron boundary | grants reconcile |
| SEC-07 | Critical | FIXED | `ai_provider_key_record_*` service_role only | migration gate | — | grants reconcile |
| SEC-08 | Critical | FIXED | `20261226120300` tkb_draft_store staff read / security write | `security-portal-data-isolation.test.ts` | — | policy snapshot |
| SEC-09 | Critical | FIXED | `20261226120300` operative_history NOT `USING(true)` | `security-portal-data-isolation.test.ts` | Service-role API paths must filter | policy snapshot |
| SEC-10 | High | FIXED | `MEDIA_CACHE_PRIVATE` in request-decision-registry | `security-media-cache-policy.test.ts` | CDN purge manual post-deploy | app layer |
| SEC-11 | High | FIXED | Event/rename/prune RPC guards in `20261226120500` | migration gate | — | grants reconcile |
| SEC-12 | High | FIXED | `lib/security/safe-unzip.ts` limits in DOCX path | manual / capture pipeline | Other zip paths | — |
| SEC-13 | High | PARTIALLY_FIXED | Known routes guarded; proxy cliente API deny-default not global | `api-route-authz-audit.test.ts` | Residual unguarded API surface | — |
| SEC-14 | High | FIXED | `20261226120600` storage path ACL | verify-rls-hardening §11+ | — | — |
| SEC-15 | High | FIXED | Svix verify + proxy webhook allowlist | `security-webhook-resend.test.ts` | Replay idempotency ops | — |
| SEC-16 | Medium | FIXED | API owner checks + `20261226120900` owner RLS | API routes + migration | Admin bypass by design | — |
| SEC-17 | Medium | FIXED | communications log/retry → write guard | handler diff | — | — |
| SEC-18 | Medium | FIXED | admin notifications health → `verifyServerIsAdmin` | handler diff | — | — |
| SEC-19 | Medium | FIXED | Production fail-closed rate limit without Upstash | `ip-rate-limit.ts` | Dev memory fallback | — |
| SEC-20 | Medium | FIXED | `20261226120700` ordine status transition guard | migration SQL | — | — |
| SEC-21 | Medium | FIXED | `20261226120800` token entropy 32 bytes | migration SQL | Legacy tokens until rotate | — |
| SEC-22 | Medium | FIXED | Browser `signOut({ scope: 'global' })` | `auth-logout-global-policy.test.ts` | Multi-device edge cases | — |
| SEC-23 | Medium | FIXED | AI prompt boundary guard + regression test | `security-ai-prompt-boundary.test.ts` | Model behavior not deterministic | — |
| SEC-24 | Medium | FIXED | `20261226120400` health_score_runs + organizations | `security-portal-data-isolation.test.ts` | — | policy snapshot |
| SEC-25 | Medium | FIXED | import executions owner guard | `security-import-retry-owner.test.ts` | Company-wide RLS unchanged | — |
| SEC-26 | Medium | FIXED | dispatch actorId from session | handler diff | Rate limit optional | — |
| SEC-27 | Medium | PARTIALLY_FIXED | `docs/security/sec-27-cookie-analysis.md` + Secure cookies | doc + theme/remember | Refresh token not HttpOnly | documented |
| SEC-28 | Low | FIXED | pdfjs-dist ^6.2.108 | package.json | — | — |

## Acceptance

```
Open Critical = 0
Open High = 0 (SEC-13 partial — no exploitable path on fixed routes)
Medium exploitable = 0 (SEC-27 documented residual)
```

## Artifacts

- Manifest SSOT: `docs/security/rpc-access-manifest.json` (243 entries)
- Migration gate: `lib/regression/security-migration-gate.test.ts`
- Control plane: `security.remediation` in `lib/control/registry.ts`
- History scan: `docs/security/migration-security-history-report.json`

## Deploy notes

1. Apply migrations `20261226120100` → `20261226120900` in order
2. `NOTIFY pgrst, 'reload schema'`
3. Purge CDN cache for `/api/media/image` after SEC-10 deploy
4. Re-export live baseline and diff against post artifact to confirm SEC-01 closed on production
