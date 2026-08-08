# Android PWA Cold Start — Report diagnostico

**Stato:** strumentazione implementata; campagna device fisico **da eseguire** (vedi procedura).  
**Procedura:** [`android-pwa-cold-start-procedure.md`](./android-pwa-cold-start-procedure.md)

---

## A. Diagnosi (da completare post-campagna)

### Tre bucket — valori misurati

| Bucket | Mediana (ms) | Range | Confidence / nota |
|--------|-------------|-------|-------------------|
| Native launch gap (stimato) | _pending_ | _pending_ | `very_low`–`low` — non usare per attribuzione web |
| Web startup (`timeOrigin` → FCP) | _pending_ | _pending_ | Misurabile |
| Application startup (FCP → `first_useful_ui`) | _pending_ | _pending_ | Misurabile |
| Tempo percepito (cronometro esterno) | _pending_ | _pending_ | Solo validatore UX reale |

### Criterio diagnostico

Compilare dopo iterazione 1 (30 run device) o proxy Playwright:

```text
[ ] native_launch_gap >> web_startup + application_startup  → limite intervento codice
[ ] web_startup + application_startup >> native_launch_gap    → ottimizzabile lato web
[ ] static_boot → first_useful_ui dominante in application    → focus bootstrap/bundle
```

**Soglie `>>` e "dominante":** derivare dai dati (es. rapporto mediano > 2×), non prefissate.

### Ipotesi da verificare

- [ ] I 500–1000+ ms percepiti sono **Android/Chrome** (native gap dominante)
- [ ] Android termina presto e **boot screen React/bundle** mantiene la stessa UI (application startup dominante)

---

## B. Timeline misurata (template per run)

```text
[STIMA, confidence: ___]  native launch gap
0 ms                        navigationStart / timeOrigin
___ ms                      responseStart (TTFB)
___ ms                      cab_static_boot_visible
___ ms                      first-contentful-paint          ← fine web startup
___ ms                      react_root_mount
___ ms                      app_boot_screen_mount
___ ms                      app_boot_static_hidden
___ ms                      app_boot_dismiss
___ ms                      first_useful_ui                 ← fine application startup
[ESTERNO]                   tap → UI utile (percepito)
```

### Sequenza static → React (mediane)

| Measure | Mediana (ms) | Note |
|---------|-------------|------|
| `static_to_fp` | _pending_ | |
| `fp_to_react` | _pending_ | |
| `react_to_boot_mount` | _pending_ | |
| `boot_mount_to_static_hidden` | _pending_ | Sospetto gap visivo |
| `static_hidden_to_dismiss` | _pending_ | |

---

## C. Cause per impatto (post-analisi)

| Causa | Impatto | Evidenza |
|-------|---------|----------|
| _da compilare_ | critico / importante / secondario / inevitabile | _run JSON_ |

### Verdict preliminare architettura (pre-misura device)

| Area | Verdict |
|------|---------|
| Manifest (`background_color`, icone) | Allineato `#09090b` — nessuna incoerenza evidente |
| Service Worker cold start | Route auth `network-only`; registrazione post-auth — **basso rischio** blocco |
| Settings prefetch layout | Blocca TTFB gestionale — **misurare quota in web startup** |
| `AppBootScreen` nasconde statico al mount | **Sospetto** — validare con `boot_mount_to_static_hidden` |
| Bundle firstLoadJs ~1793KB | **Sospetto** — validare in `fp_to_react` su device lento |

---

## D. Ottimizzazioni sicure (solo post-evidenza)

Nessuna ottimizzazione codice applicata in questa fase — attesa dati campagna.

| Intervento | Condizione dati | Stato |
|------------|-----------------|-------|
| Non nascondere `#cab-app-boot` fino a React painted | `boot_mount_to_static_hidden` dominante | **Non applicato** |
| Logo boot `<img>` vs `next/image` | Gap `fp_to_react` / visivo | **Non applicato** |
| Manifest allineamento | Mismatch visivo osservato | **Non applicato** |
| `__cabForceNavDiagnostics` gate | Strumentazione E2E | **Applicato** |

---

## E. Ottimizzazioni da NON fare

- Auto `skipWaiting` / reload cold start
- Cache HTML route autenticate
- Bypass hydration / stati auth-settings falsi
- Skip `prefetchGestionaleLayoutSettings` senza alternativa
- `setTimeout` per mascherare splash
- UI utile prima di session/settings ready
- Modifiche SW che serializzano navigazione
- Seconda loading screen parallela

---

## F. Piano implementazione (ordinato per sicurezza)

1. **Completare iterazione 1** su device Android (30 run) — procedura allegata
2. **Aggregare:** `node scripts/ops/android-cold-start-aggregate.mjs`
3. **Applicare criterio diagnostico** — una sola ipotesi dominante
4. **Iterazione 2** solo sul collo di bottiglia
5. **Tier 1** — un intervento, baseline ≥5 run, benchmark post, regressioni
6. **Tier 2** — solo se Tier 1 insufficiente e rischio accettabile

### Regola per ogni modifica

1. Baseline misurata  
2. Ipotesi causale  
3. Modifica minima  
4. Benchmark post-modifica  
5. Verifica regressioni  

**Fallimento** se migliora il tempo ma introduce fetch duplicati, auth incoerente, regressioni PWA/update, draft non salvati.

---

## G. Verifica regressioni (checklist post-intervento)

- [ ] Cold launch ≥5 run — varianza accettabile
- [ ] Login / sessione persistente
- [ ] Settings owner — no refetch inutile se dehydrate
- [ ] Hydration boundary layout + page
- [ ] React Query — `duplicateCount` waterfall stabile
- [ ] SW update banner — no reload cold start
- [ ] DataStale — fuori critical path
- [ ] Draft non salvati — `pwa-update-guard` intatto
- [ ] Last-route restore — no loop redirect
- [ ] Navigazione warm — `first_interactive` non regressa
- [ ] E2E: `mobile-nav-stress`, `android-pwa-cold-start` (proxy)

---

## Proxy Playwright (riferimento locale)

Dati raccolti automaticamente in `test-results/android-cold-start/playwright-proxy-*.json` quando si esegue:

```bash
NEXT_PUBLIC_BOOT_INVESTIGATION=1 PERF_USE_DEV=1 npx playwright test e2e/perf/android-pwa-cold-start.spec.ts -c e2e/perf/playwright.config.ts
```

**Nota:** il proxy **non** misura la splash nativa Android. Serve solo a validare strumentazione e ordine marks.

---

## Strumentazione implementata

| Artefatto | Path |
|-----------|------|
| Report export | `window.__cabColdStartReport` |
| Modulo diagnostica | `lib/observability/cold-start-diagnostics.ts` |
| Marks lazy | `lib/observability/cold-start-diagnostics-lazy.ts` |
| Bridge mount | `src/components/cold-start-diagnostics-bridge.tsx` |
| Gate runtime E2E | `__cabForceNavDiagnostics` in `navigation-boot-gate.ts` |
| Policy test | `lib/regression/cold-start-diagnostics-policy.test.ts` |
| E2E proxy | `e2e/perf/android-pwa-cold-start.spec.ts` |
| Aggregatore | `scripts/ops/android-cold-start-aggregate.mjs` |
