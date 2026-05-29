# Maintenance governance

Policy semplici per evitare degrado progressivo del repo. Stability-first — no cleanup massivi.

## Cleanup tecnico

| Regola | Dettaglio |
|--------|-----------|
| Scope | Max 1 area per PR (es. solo `lib/documenti` o solo un modulo) |
| Gate | Tutti i gate release devono restare verdi |
| Mix | No cleanup + feature business nella stessa PR |
| Priorità | Rimuovere dead code solo con 0 call site verificato (grep + tsc) |

## Deprecated helper

| Regola | Dettaglio |
|--------|-----------|
| Marcatura | `@deprecated` con motivo e alternativa |
| Tracking | Issue o nota in PR — non accumulare silent |
| Rimozione | Solo dopo 0 call site + gate verde + 1 release di buffer |
| Esempi attuali | `cabDevWarn` → `gestionaleLogger`; legacy toast allowlist |

## Temp flags

| Regola | Dettaglio |
|--------|-----------|
| Naming | `NEXT_PUBLIC_*` solo se necessario client-side |
| Production | Pilot flags **bloccati** da `production:check` |
| Lifecycle | Rimuovere entro 2 release o convertire in setting DB |
| Documentazione | Aggiornare `.env.production.example` e `validate-production-env` |

Flag attuali da monitorare:

- `NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS` — bloccato production
- `NEXT_PUBLIC_STAGING_PUBLIC` — solo preview isolato
- `NEXT_PUBLIC_SCHEDE_LOCAL_PRIMARY` / `NEXT_PUBLIC_PREVENTIVI_DB_PRIMARY` — data source toggles

## Pilot code

| Regola | Dettaglio |
|--------|-----------|
| Doppio gate | Env **e** DB (`app_settings`) devono essere allineati |
| Default | Mai default-on in production |
| UI | Security dashboard per toggle — non env file production |
| Verifica | `production:check` + truth layer `resolvePilotSettingsState` |

## Migration hygiene

| Regola | Dettaglio |
|--------|-----------|
| Naming | Timestamp `YYYYMMDDHHMMSS_descrizione.sql` |
| Backup | Export SQL / snapshot **prima** di migration distruttiva |
| Rollback | Preparare SQL rollback per DROP/ALTER irreversibili |
| Verify | Eseguire [`scripts/verify-rls-hardening.sql`](../scripts/verify-rls-hardening.sql) post-migration RBAC |
| RLS | Ogni nuova tabella operativa → policy RLS + test manuale |
| Deploy | `supabase db push` solo dopo review PR + gate verde |

## Env hygiene

| Regola | Dettaglio |
|--------|-----------|
| Template | Mantenere [`.env.production.example`](../.env.production.example) e [`.env.smoke.example`](../.env.smoke.example) |
| Secrets | Mai committare `.env.local`; service role solo CI/locale diagnostica |
| Validazione | `npm run ops:env-check` in smoke regression |
| Vercel audit | Trimestrale: verificare assenza service role e pilot flags |

## Observability hygiene

| Regola | Dettaglio |
|--------|-----------|
| Nuovi eventi | Aggiungere a [`events.ts`](../lib/observability/events.ts) + riga in [observability.md](./observability.md) |
| Severity | Allineare `EVENT_LEVEL` e [observability-ops.md](./observability-ops.md) |
| PII | No password, token, payload file nei log |
| Meta | Max 500 char per stringa (già enforced) |
| Degradation | Nuove soglie → `degradation-detector.ts` + doc ops |

## Test hygiene

| Regola | Dettaglio |
|--------|-----------|
| Logic | Regression tsx in `lib/regression/` e `smoke:regression` |
| E2E | Playwright solo flow critici — no duplicare gate statici |
| Unit | `production-readiness.test.ts`, `validate-production-env.test.ts` |
| Fuori scope CI | `lint`, `test:permissions`, `ios:check` — eseguire manualmente pre-major |
| Smoke skip | Documentare env opzionali (operator, documenti) |

## Cadence consigliata

| Frequenza | Attività |
|-----------|----------|
| Ogni PR | Gate release verde |
| Pre-release major | `ops:diagnostics` con `OPS_DIAGNOSTICS_REQUIRE_DB=1` |
| Trimestrale | Audit `@deprecated`, pilot flags, env Vercel |
| Post-incident | Aggiornare [incident-checklist.md](./checklists/incident-checklist.md) se gap |

## Cosa non fare

- Refactor massivi "while we're here"
- Rimuovere gate o bypassare branch protection
- Aggiungere APM esterno senza decisione esplicita
- Cleanup observability/fatal aggregator senza capire degradation flow
- Migration distruttiva senza backup

## Riferimenti

- [feature-evolution-rules.md](./feature-evolution-rules.md)
- [ops-production-checklist.md](./ops-production-checklist.md)
- [release-gate.md](./release-gate.md)
