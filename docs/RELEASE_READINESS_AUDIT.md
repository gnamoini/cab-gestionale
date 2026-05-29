# Release Readiness Audit

**Data:** 2026-05-28  
**Scope:** Production-grade maintainable release (regression layer, observability, smoke Playwright, release hardening)  
**Nessuna nuova feature business; nessun cambio UX visibile intenzionale.**

---

## 1. RELEASE READINESS SCORE

| Componente | Peso | Score | Note |
|------------|------|-------|------|
| Codice / tsc / build | 25% | 100 | `ci:tsc`, `ci:build` PASS |
| UX / mobile gates | 15% | 100 | `ux:enforce`, `ux:mobile-gate` PASS (warnings euristiche) |
| Production readiness (static) | 20% | 85 | PASS locale senza DB; CI richiede secrets |
| Regression (tsx) | 15% | 100 | `smoke:regression` + `smoke:structural` PASS |
| Runtime smoke (Playwright) | 15% | 50* | *SKIP locale senza `SMOKE_*`; CI dipende da secrets |
| Observability production | 10% | 90 | Health markers + fatal aggregator implementati |

**Score complessivo stimato: 88/100** (con Playwright CI verde → **94/100**)

---

## 2. GO / NO-GO

| Ambiente | Decisione | Confidence |
|----------|-----------|------------|
| **Merge codice / static gates** | **GO** | 92% |
| **Deploy production (CI completo)** | **GO condizionato** | 78% |

**Condizioni per GO production pieno:**

1. GitHub Actions `release-gate` verde su `main` con `SUPABASE_*` + `SMOKE_ADMIN_*` configurati.
2. Utente smoke dedicato + (opzionale) `SMOKE_DOCUMENTI_LAVORAZIONE_ID` per test upload.
3. Branch protection richiede check `release-gate`.

---

## 3. Gate eseguiti (questa sessione)

| Comando | Esito | FAIL env vs codice |
|---------|-------|-------------------|
| `npm run ci:tsc` | **PASS** | — |
| `npm run ci:build` | **PASS** | — |
| `npm run ux:enforce` | **PASS** | — |
| `npm run ux:mobile-gate` | **PASS** (14 warnings euristici) | — |
| `npm run production:check` | **PASS** (DB skipped) | **FAIL in CI** se mancano `SUPABASE_SERVICE_ROLE_KEY` / URL → **env**, non codice |
| `npm run smoke:structural` | **PASS** | — |
| `npm run smoke:regression` | **PASS** | — |
| `npm run smoke:playwright` | **SKIP** locale | **FAIL** solo se secrets assenti in CI quando step non skippato → **env** |
| `npm run release:gate` | **Advisory** | Con `PRODUCTION_CHECK_REQUIRE_DB=1` + `CI=true` (default script) → **FAIL env** senza DB secrets |

**Nota PowerShell:** non troncare l’output di `release:gate` con `Select-Object -First N` — può terminare il processo con exit code anomalo.

---

## 4. Residual risks

### CRITICAL

- Nessuno bloccante da codice rilevato in questa passata.

### HIGH

| ID | Rischio | Mitigazione |
|----|---------|-------------|
| H1 | CI Playwright senza `SMOKE_*` | Configurare secrets; altrimenti step fallisce in Actions |
| H2 | `production:check` richiede DB in CI | Secrets Supabase service role obbligatori su `main` |
| H3 | Edge RBAC vs `user_permissions` client | Matrice `canAccessRoute` + smoke RBAC; proxy pilot su `/impostazioni` |

### MEDIUM

| ID | Rischio | Mitigazione |
|----|---------|-------------|
| M1 | Polling fallback 20s se realtime down | `realtime.polling.fallback` log; smoke passivo dashboard 15s |
| M2 | Cache `lavQuery` diversa dashboard/report | Documentato in `docs/performance-query-policies.md` |
| M3 | Upload documenti smoke dipende da seed | `SMOKE_DOCUMENTI_LAVORAZIONE_ID` opzionale; spec skip se assente |
| M4 | Login rate limit Supabase | Utenti smoke dedicati; spec seriali |

### LOW

| ID | Rischio | Mitigazione |
|----|---------|-------------|
| L1 | UX mobile score euristico 44 | Gate PASS su blocker; score informativo |
| L2 | Legacy `useToast` in allowlist enforcement | Tracciato in production warnings |
| L3 | `@deprecated` API pubbliche | Mantenute per compatibilità; no rimozione in questa release |

---

## 5. Performance risks

- **Burst invalidation:** debounce 400ms dashboard + coalesce truth layer; spike → `fatal-aggregator`.
- **Report:** single `lavQuery` + `skipReportBroadcast` su refresh report.
- **Rerender:** nessun micro-memo aggiunto (scope-safe); monitorare con `NEXT_PUBLIC_OBS_PERF=1`.

---

## 6. Security risks

- Production readiness blocca pilot env `NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS=1`.
- RLS / portal guard verificati in CI con DB snapshot.
- Log: sanitize password/token; meta max 500 char.

---

## 7. Scalability risks

- Playwright: 1 worker, chromium only, ~3–6 min stimati in CI.
- Fatal aggregator: max 50 entry in-memory (per tab client).
- Realtime reconnect backoff max 30s.

---

## 8. Maintainability score

**82/100**

| Aggiunto | Percorso |
|----------|----------|
| Regression helpers | `lib/regression/*` |
| Structural gate | `scripts/smoke-structural-gate.ts` |
| Smoke Playwright | `e2e/smoke/*.spec.ts`, `e2e/playwright.config.ts` |
| Fatal aggregator | `lib/observability/fatal-aggregator.ts` |
| Docs | `docs/observability.md`, `docs/release-gate.md`, `.env.smoke.example` |

---

## 9. What could still break

1. **Hydration** su route pesanti (lavorazioni kanban) — smoke `07-hydration-runtime` + listener window.
2. **Modali stacked** — non coperti da smoke dedicato (solo drawer mobile); magazzino modali su shell condivisa.
3. **Permessi operatore custom** — smoke operatore skip se env assente; matrice tsx non sostituisce tutte le combinazioni moduli.
4. **Storage orphan** — retry delete in codice; audit orphan DB non automatizzato.
5. **Fork PR** — workflow non esegue secrets (by design).

---

## 10. Technical debt residuo

- `useNavHrefPermission` non wired in app-shell nav (doppio path RBAC nav vs guard — comportamento invariato).
- Test Playwright documenti parziali senza seed completo.
- Nessun Vitest; pattern `tsx` + Playwright smoke.
- Mobile UX heuristic score basso ma gate PASS.

---

## 11. Playwright — struttura e copertura

```
e2e/
  playwright.config.ts
  fixtures/auth.ts
  helpers/console.ts
  helpers/regression.ts
  smoke/
    01-auth.spec.ts
    02-rbac-routes.spec.ts
    03-dashboard-report.spec.ts
    04-modal-scroll.spec.ts
    05-document-lifecycle.spec.ts (skip senza lavorazione test)
    06-mobile-shell.spec.ts
    07-hydration-runtime.spec.ts
```

**Flow coperti:** auth, RBAC, dashboard/report load, drawer scroll-lock, mobile overflow, hydration errors, realtime passive stability.

**Esclusi volutamente:** pixel diff, animazioni, portale clienti E2E, matrice RBAC completa moduli (tsx matrix), load test.

**Fragilità residue:** upload documenti multi-step; operatore RBAC dipende da permessi DB reali.

**Runtime CI stimato:** 4–8 min (build già fatto + `npm run start` :3210 + 7 spec seriali).

---

## 12. Comandi rapidi

```powershell
npm run ci:tsc
npm run ci:build
npm run ux:enforce
npm run ux:mobile-gate
npm run production:check
npm run smoke:structural
npm run smoke:regression
# Con credenziali in .env.local:
# npm run smoke:playwright
npm run release:gate
```

---

## 13. Governance rollout (2026-05-29)

Documentazione platform governance aggiunta:

- [PLATFORM_STATUS_REPORT.md](./PLATFORM_STATUS_REPORT.md) — report unificato score + gate results
- [checklists/rollout-checklist.md](./checklists/rollout-checklist.md) — rollout master
- [observability-ops.md](./observability-ops.md) — monitoring production
- [feature-evolution-rules.md](./feature-evolution-rules.md) — regole PR future
- [maintenance-governance.md](./maintenance-governance.md) — hygiene repo
