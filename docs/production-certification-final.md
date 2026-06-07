# Production Certification Finale — Gestionale CAB

**Data certificazione:** 2026-06-07  
**Project Supabase:** `oxmnuovsgenqkuwfolqh` (produzione)  
**Metodo:** sintesi evidenze audit completati + gate automatici fresh + query F5 live  
**Vincolo:** nessun nuovo fix applicato; soak 4h non eseguito (evidenze ~5 min + gate statici).

---

## Executive Certification Summary

Il ciclo audit Supabase/performance è **chiuso a livello runtime client**: refetch storm target (RF-01/F1/F3) risolto, subscription duplicate eliminate, heap stabile in finestra osservata, RLS audit PASS, Caso 4 non più attivo come degradazione misurabile in sessione breve.

La certificazione **formale long-running 4h** non è completata. La migration **F5** (prune publication `segnalazioni`/`support_notes`) **non è deployata** su produzione al timestamp di certificazione.

| Esito | Valore |
|-------|--------|
| **Certification status** | **B — CONDITIONALLY STABLE** |
| **Go-live recommendation** | **CONDITIONAL YES** |
| **Production readiness score** | **7.5 / 10** |

Il sistema è **production-safe per uso operativo quotidiano** con vincoli di deployment hygiene (F5) e monitoraggio long-session documentato. Non è ancora **A — PRODUCTION CERTIFIED STABLE** senza soak 4h e parità F5 live.

---

## Gate automatici (Fase 0) — 2026-06-07T02:01Z

| Gate | Esito |
|------|-------|
| `npm run ci:tsc` | **PASS** |
| `npm run audit:rls` | **PASS** — 18 tabelle service coperte |
| `npm run audit:supabase` | **PASS** — 81 migration repo |
| `long-session-stability-policy.test.ts` | **PASS** — invarianti F1/F2/F3/F5 file |
| `npm run production:check` | **PASS** (0 blockers; DB snapshot skipped in locale) |
| `npm run smoke:regression` | **PARTIAL** — fail pre-esistente `forms-save-policy.test.ts` (fuori scope performance) |

### Smoke regression — dettaglio route

| Area | Test gate | Esito |
|------|-----------|-------|
| Security | `security-rbac-policy`, `security-users-permissions-policy`, `truth-invalidation` | **PASS** |
| Magazzino / sync | `sync-invalidation-policy`, F3 static | **PASS** |
| Report | `report-kpi-bundle`, `performance-policy` | Non raggiunto (suite interrotta) — copertura da policy file |
| Dashboard | `truth-invalidation`, promemoria tests in suite post-fail | Non raggiunto |
| Impostazioni | `forms-save-policy` | **FAIL pre-esistente** — refactor pagina `/impostazioni`; non introdotto da fix performance |
| Mezzi / RBAC route | `rbac-route-matrix`, `permissions-role-matrix` | **PASS** |
| Login / auth | `user-module-permissions`, auth in rbac matrix | **PASS** |
| Performance / long-session | `performance-policy`, `long-session-stability-policy` | **PASS** (long-session); performance non raggiunto in suite |

**Classificazione:** fail `forms-save-policy` = debito UX impostazioni pre-audit; **non blocker** certificazione performance long-running.

---

## Long-session stability result

| Durata | Eseguito | Esito certificazione | Fonte |
|--------|----------|---------------------|-------|
| ~5 min | Sì | **PASS** | [audit-supabase-performance-validation-post-fix.md](./audit-supabase-performance-validation-post-fix.md) |
| 30 min | No | **N/A** | — |
| 2 h | No | **N/A** | — |
| 4 h (obbligatorio brief) | No | **NOT CERTIFIED** | — |
| 8 h | No | **N/A** | — |

### Metriche client (finestra ~5 min, admin, Realtime connected)

| Checkpoint | heapUsedMb | cabSyncListeners | dispatchTotal | realtimeMode |
|------------|------------|------------------|---------------|--------------|
| T0 dashboard | 37 | 6 | 0 | connected |
| Security | 53 → 38 idle | 4 | 0 | connected |
| Route churn + idle 90s | 51 → 37 | 2–6 | 0 | connected |

- Nessuna curva heap monotona crescente nel campione.
- Subscriptions bounded per route, nessun drift temporale osservato.
- Rerender / Profiler: non campionati numericamente; nessun loop bridge rilevato in audit statico.

### Network

| Metrica | Valore | Verdetto |
|---------|--------|----------|
| REST Supabase idle | ~1 req/min | Stabile |
| Refetch storm | Assente (dispatch=0 idle) | **PASS** |
| Loop query | Non osservati | **PASS** |

### Realtime (sessione)

| Metrica | Valore | Verdetto |
|---------|--------|----------|
| Channel bridge | 1 (`cab-gestionale-rt`) | Stabile |
| Duplicati Security | 0 (F1) | **PASS** |
| Event duplication ratio | Non quantificato WS-frame | N/A — impatto client nullo su tabelle F5 |

**Long-session verdict:** **STABLE (short-window only)** — **4h NOT CERTIFIED**.

---

## Memory trend verdict

| Criterio | Esito | Evidenza |
|----------|-------|----------|
| Crescita progressiva RAM | **Non osservata** (campione breve) | Slope −0.571 MB/min su ~1.7 min; recupero GC a 37 MB |
| Jump route-load | Atteso | +16 MB dashboard→security, normalizzato post-idle |
| Soglia +30% in 4h | **Non testabile** | [long-session-soak-baseline.md](./long-session-soak-baseline.md) |

**Verdetto:** **STABLE (limited)** — assenza degradazione nella finestra misurata; **silent drift 4h non escluso**.

---

## Realtime stability verdict

| Layer | Verdetto | Note |
|-------|----------|------|
| Client bridge | **STABLE** | 16 tabelle; cleanup; F1/F3 PASS |
| Server publication | **CONDITIONAL** | F5 non deployata — 19 tabelle prod vs 17 attese |
| Drift impatto runtime | **NONE measurable** | Bridge non sottoscrive `segnalazioni`/`support_notes` |

**Verdetto:** **STABLE (client)** / **CONDITIONAL (infra parity)**.

---

## Refetch stability verdict

| Fix | Status | Evidenza |
|-----|--------|----------|
| RF-01 / F2 (theme → no full operational) | **RESOLVED** | Gate statico + dispatch=0 idle |
| F1 (Security dup channel) | **RESOLVED** | Policy test + no `postgres_changes` locale |
| F3 (magazzino triple listener) | **RESOLVED** | Policy test |
| RF-02 / RF-06 residui | **Attenuated** | Attivi solo se Realtime disconnected / report stale |
| Refetch storm misurabile | **Assente** | ~1 REST/min idle; dispatch=0 |

**Verdetto:** **STABLE** — Caso 4 runtime refetch **non attivo** in condizioni normali (Realtime connected).

---

## Regression check summary

| Categoria | Esito |
|-----------|-------|
| Fix performance non regressi (F1/F2/F3) | **PASS** — policy test |
| RBAC / security / sync | **PASS** |
| Impostazioni UX policy | **FAIL pre-esistente** — non correlato performance |
| Architettura lifecycle | **PASS** — handlerRef, bridge cleanup, dedup dispatch |

**Verdetto regressioni performance:** **PASS** con eccezione documentata fuori scope.

---

## Drift impact confirmation (F5 live — fresh 2026-06-07T02:01Z)

| Query | Risultato | Atteso post-F5 |
|-------|-----------|----------------|
| F5 in `schema_migrations` (`20260709120000`) | **0 righe** | 1 riga |
| Query 6d (`segnalazioni`, `support_notes`) | **2 righe** | 0 righe |
| Count `pg_publication_tables` | **19** | **17** |

**Drift confermato:** produzione = repo **pre-F5**.

| Affermazione | Conferma |
|--------------|----------|
| Drift NON impatta runtime client | **SÌ** — bridge non sottoscrive tabelle deprecated |
| Drift NON genera overhead significativo misurato | **SÌ** — DML storico basso; short-soak stabile |
| Drift NON influenza long-session behavior osservato | **SÌ** — nessuna correlazione nelle metriche ~5 min |

Dettaglio: [audit-supabase-realtime-parity.md](./audit-supabase-realtime-parity.md).

---

## Architecture stability check

| Layer | Verdetto |
|-------|----------|
| Frontend React lifecycle | **STABLE** |
| Subscription cleanup | **STABLE** |
| Supabase realtime usage | **BOUNDED** (client); **drift infra** (server F5) |
| RLS cost | **STABLE (de-amplified)** — audit PASS |
| Query amplification | **UNDER CONTROL** |

---

## Degradation test (explicit)

| Criterio | Certificazione |
|----------|----------------|
| Nessuna crescita progressiva RAM | **PASS (limited)** |
| Nessun aumento progressivo query/min | **PASS** |
| Nessuna crescita subscription nel tempo | **PASS** |
| Nessun silent drift performance (4h) | **NOT EXCLUDED** |

---

## Final production readiness score (0–10)

| Dimensione | Peso | Score | Ponderato |
|------------|------|-------|-----------|
| Runtime refetch/realtime client | 25% | 9.0 | 2.25 |
| Long-session proof | 25% | 6.0 | 1.50 |
| Infra parity (F5 live) | 15% | 6.5 | 0.98 |
| RLS / security gates | 15% | 8.0 | 1.20 |
| Regression gates | 10% | 7.5 | 0.75 |
| Residual RF-02/06 | 10% | 7.5 | 0.75 |

**Totale: 7.5 / 10**

Allineato all'ecosystem audit ([7.8/10](./audit-supabase-ecosystem.md)) con penalità certificazione per soak 4h assente e F5 non deployata.

---

## Certification status

### B — CONDITIONALLY STABLE

| Criterio A | Stato |
|------------|-------|
| Gate PASS | Sì (smoke parziale documentato) |
| Short-soak stabile | Sì |
| F5 live OK | **No** |
| Soak 4h PASS | **No** |

| Criterio C | Stato |
|------------|-------|
| Gate FAIL critico | No |
| Refetch storm | No |
| Degradazione monotona | No (finestra breve) |

---

## Go-live recommendation

### CONDITIONAL YES

**Sì** all'uso in produzione per operatività quotidiana, con condizioni:

1. **Deploy F5** — apply [`20260709120000_realtime_prune_deprecated_supporto.sql`](../supabase/migrations/20260709120000_realtime_prune_deprecated_supporto.sql); verificare query 6d = 0 righe.
2. **Monitoraggio** — `window.__cabLongSessionMetrics()` prime 2 settimane post-go-live (dev/staging o script operatore).
3. **Upgrade a A** — soak browser 4h per [long-session-soak-baseline.md](./long-session-soak-baseline.md) (heap +30% soglia).

**NO** solo se: gate critici falliscono, refetch storm riappare, o soak 4h mostra degradazione monotona.

---

## Condizioni upgrade B → A

| # | Requisito | Verifica |
|---|-----------|----------|
| 1 | F5 deployata | `schema_migrations` contiene `20260709120000`; publication count = 17 |
| 2 | Soak 4h | Campioni ogni 30 min; heap slope sub-lineare; dispatch non crescente in idle |
| 3 | Gate regression | `smoke:regression` PASS (o fail noti accettati documentati) |
| 4 | Riesame score | Target ≥ 8.5/10 con long-session proof ≥ 8.0 |

---

## Riferimenti audit (ciclo chiuso)

| Documento | Ruolo nel ciclo |
|-----------|-----------------|
| [audit-supabase-ecosystem.md](./audit-supabase-ecosystem.md) | Audit infra iniziale — score 7.8 |
| [audit-supabase-performance-degradation.md](./audit-supabase-performance-degradation.md) | Root cause Caso 4 + fix F1–F5 |
| [audit-supabase-performance-validation-post-fix.md](./audit-supabase-performance-validation-post-fix.md) | Validazione empirica post-fix |
| [audit-supabase-realtime-parity.md](./audit-supabase-realtime-parity.md) | Parità repo vs prod — drift F5 |
| [long-session-soak-baseline.md](./long-session-soak-baseline.md) | Protocollo soak futuro |

---

## Dichiarazione formale

> Il gestionale CAB, al 2026-06-07, è **certificato CONDITIONALLY STABLE (B)** per produzione: runtime client stabilizzato post-fix Caso 4, gate RLS e policy long-session PASS, assenza refetch storm misurabile in sessione reale breve. La certificazione **full long-running (A)** resta subordinata al deploy migration F5 su produzione e al completamento soak 4h documentato.

**Firmato da:** processo certificazione automatizzato + evidenze audit repo  
**Validità snapshot:** query produzione e gate eseguiti 2026-06-07T02:01Z
