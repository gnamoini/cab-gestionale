# Audit e pulizia debug per produzione — Report finale

Data: 2026-06-05

## 1. Inventario strumenti debug trovati (pre-pulizia)

| Categoria | Elemento | File | Utilizzo | Decisione |
|-----------|----------|------|----------|-----------|
| Ingest HTTP | URL `127.0.0.1:7662/ingest/...` sessione 929eab | `scripts/dev-cpu-crash-probe.ts`, `scripts/dev-cursor-lag-probe.ts` | Solo npm script dev | **Rimosso** |
| Agent log | `#region agent log` + fetch ingest | Stessi script | Solo npm script dev | **Rimosso** |
| Probe runtime | `lib/debug/modal-input-lag-probe.ts`, `ricambio-input-lag-probe.ts` | — | Già assenti | Già eliminato |
| Debug UI mount | Visual linter, UI OS shadow, DS lock, responsive audit | `components/gestionale/app-shell.tsx` | DEV-only (`NODE_ENV`) | **Mantenuto** |
| Compat dev tools | `window.__compatAudit` / `__compatRepairAll` | `lib/magazzino/compat/compat-dev-tools.ts` | DEV-only | **Mantenuto** |
| Select debug | `debugSelectOptions` | `src/shared/selectors/debug-options-log.ts` | Env `NEXT_PUBLIC_DEBUG_SELECT_OPTIONS=1` | **Mantenuto** |
| Pipeline debug | `logClientPortalPipelineDebug` | `lib/lavorazioni/client-portal-list-filters.ts` | DEV-only | **Mantenuto** |
| Log artefatti | `.cursor/debug-*.log` | Locale | Cursor session logs | **Eliminati** (locali) |
| Mock / fake | Nessun mock service | `fakeLavFromPreventivo` in mezzi-hub-merge | Logica dominio | **Mantenuto** |
| Route debug | Nessuna | — | — | N/A |

### Console in runtime applicativo

- `app/` e `components/`: **0** `console.log`
- Logging operativo mantenuto: `gestionaleLogger`, auth, audit-log, storage, realtime, compat guards

## 2. Elementi rimossi

- Ingest URL e header `X-Debug-Session-Id` negli script probe
- Blocchi `#region agent log` e `fetch` verso localhost ingest
- Costanti `SESSION = "929eab"` e payload `hypothesisId` agent-specific
- File locali: `.cursor/debug-929eab.log`, `.cursor/debug-bb7cdf.log`, `.cursor/debug-b1d6c0.log`

## 3. Elementi mantenuti

- `gestionaleLogger` + `RuntimeHealthBridge` (ops snapshot)
- `log_modifiche` / audit trail (`src/services/internal/audit-log.ts`)
- `auth_logs`, warn auth/storage/realtime/sync
- Compat read/write guards e runtime sanitize
- Mount DEV in app-shell (guard `NODE_ENV !== "development"`)
- `compat-dev-tools`, `debug-options-log`, `debugTag` su `useGlobalOptions`
- Feature flag produzione (`NEXT_PUBLIC_STAGING_PUBLIC`, `NEXT_PUBLIC_COMPAT_*`, ecc.)
- Script ops/CI (`ops:diagnostics`, `production:check`, audit UI/flex)

## 4. File modificati

| File | Modifica |
|------|----------|
| `scripts/dev-cpu-crash-probe.ts` | Sanificato: solo log locale `dev-probe.log` |
| `scripts/dev-cursor-lag-probe.ts` | Sanificato: solo log locale `dev-probe.log` |
| `docs/audit-modal-input-lag-report.md` | Nota probe rimossi |
| `lib/regression/debug-instrumentation-policy.test.ts` | **Nuovo** — policy anti-ingest/debug |
| `scripts/smoke-regression-tests.ts` | Registrato nuovo test |
| `.gitignore` | Aggiunti `dev-probe.log`, `debug-929eab.log` |

## 5. Mock eliminati

Nessuno (non presenti nel progetto).

## 6. Log eliminati

- Canale HTTP ingest esterno (script probe)
- Artefatti `.cursor/debug-*.log` locali

## 7. Route debug eliminate

Nessuna (non erano presenti route temporanee).

## 8. Problemi individuati

| Problema | Severità | Relazione cleanup |
|----------|----------|-------------------|
| `compat-readiness-report.test.ts` score 85 &lt; 90 | Critico (CI) | **Pre-esistente**, non legato |
| Dev linter engines nel bundle prod | Opzionale | Accettato (guard runtime) |
| `smoke:regression` fallisce su compat-readiness | CI blocker | Separato da questo audit |

## 9. Debito tecnico residuo

| Item | Classificazione |
|------|-----------------|
| Compat readiness score 85 | **Critico** |
| Hydration warning sidebar (sessione precedente) | **Importante** |
| `debugTag` naming su `useGlobalOptions` | Opzionale |
| `@deprecated clientPortalRowMatchesSearch` | Opzionale |
| TODO/FIXME/HACK in sorgente `*.ts\|tsx` | **0 match** |

## 10. Verifica regressioni

### Automatizzate

| Comando | Esito |
|---------|-------|
| `npm run ci:tsc` | **PASS** |
| `npx tsx lib/regression/debug-instrumentation-policy.test.ts` | **PASS** |
| `npm run production:check` | **PASS** (0 blockers, advisory warnings) |
| `npm run smoke:regression` | **FAIL** su `compat-readiness-report.test.ts` (pre-esistente) |

### Browser (spot check, dev server localhost:3000)

| Modulo | Esito |
|--------|-------|
| Dashboard | OK — KPI, feed, navigazione |
| Lavorazioni | OK (tab aperta in sessione) |
| Magazzino | OK — lista, toolbar, filtri |
| Report | OK — pagina carica |
| Login | Non ri-testato (sessione attiva) |
| Clienti / Dipendenti / Preventivi / PDF / Notifiche / Impostazioni / Sicurezza | Non ri-testati in questa sessione (nessuna modifica runtime) |

**Nota:** le modifiche toccano solo script dev, documentazione, policy test e gitignore — nessun cambiamento al bundle applicativo.

## Policy permanente

Il test `lib/regression/debug-instrumentation-policy.test.ts` garantisce che in `app`, `components`, `lib`, `src`, `context` non compaiano:

- URL ingest (`ingest/`, `127.0.0.1:7662`)
- Riferimenti `lib/debug/`
- `console.log` in `app/` o `components/` (esclusi test)
