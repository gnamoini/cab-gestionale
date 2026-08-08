# Procedura misurazione cold start PWA Android

Strumentazione: `window.__cabColdStartReport` (abilitata con `NEXT_PUBLIC_BOOT_INVESTIGATION=1` o `NEXT_PUBLIC_PERF_DIAGNOSTICS=1`).

## Regola fondamentale

Il report espone **tre bucket separati**. Non usarli in modo intercambiabile:

| Bucket | Cosa misura | Affidabilità |
|--------|-------------|--------------|
| **nativeLaunchGap** | Tap icona → inizio documento web | **Stima** (`confidence` sempre documentata) |
| **webStartup** | `timeOrigin` → FCP / `cab_static_boot_visible` | Misurabile (Navigation + Paint API) |
| **applicationStartup** | FCP/static boot → `first_useful_ui` | Misurabile (`performance.mark`) |

`performance.timeOrigin` **non** è la fine precisa della splash Android.

## Funnel tempo percepito vs web

```text
Tap icona
   ↓
[Android/Chrome — native launch gap STIMATO]
   ↓
primo pixel web                    ← inizio web startup
   ↓
static boot (cab_static_boot_visible)
   ↓
React (mount → hydration → boot screen)
   ↓
UI utile (first_useful_ui)         ← fine application startup
```

Sequenza prioritaria static → React:

```text
cab_static_boot_visible → first-paint → react_root_mount
  → app_boot_screen_mount → app_boot_static_hidden → app_boot_dismiss
```

## Build di misurazione

```bash
NEXT_PUBLIC_BOOT_INVESTIGATION=1 npm run build && npm start
```

Oppure deploy preview Vercel con la stessa env var.

Installare la PWA su Android: Chrome → menu → **Aggiungi a schermata Home**.

## Iterazione 1 — matrice minima (30 run)

| Dimensione | Valori |
|------------|--------|
| Route | `/dashboard`, `/lavorazioni`, last-route restore (`start_url=/`) |
| Scenario | **cold**, **warm** |
| Run per combinazione | **5** |
| Totale | 3 × 2 × 5 = **30** |

### Cold launch

1. Chiudere tutte le tab Chrome del dominio.
2. Impostazioni Android → App → PWA → **Forza arresto**.
3. Rimuovere dalle app recenti (swipe away).
4. Attendere 5 s.
5. Tap icona PWA.

### Warm launch

1. Aprire PWA, tornare Home (non force-stop).
2. Entro 30 s, tap icona dalle recenti o launcher.

### Last-route restore

1. Navigare a `/lavorazioni` (o altra route), chiudere PWA normalmente.
2. Cold/warm launch da `start_url=/`.
3. Nel report annotare `first_useful_ui` sulla route restaurata.

## Raccolta dati (dispositivo fisico)

1. Abilitare **USB debugging** e collegare il device.
2. Su desktop: `chrome://inspect` → ispezionare la WebView/PWA.
3. Dopo che la UI utile è visibile, in console:

```javascript
copy(JSON.stringify(window.__cabColdStartReport, null, 2))
```

4. Incollare in file:

```text
test-results/android-cold-start/<scenario>-<route>-<run>.json
```

Esempio: `cold-dashboard-03.json`

### Tempo percepito (opzionale, raccomandato)

Cronometro esterno: tap icona → prima UI utile stabile (non solo boot screen).

Annotare in un campo `perceivedMs` nel JSON o in foglio parallelo. **Solo questo** valida il percepito post-ottimizzazione.

### Native launch gap

La stima `buckets.nativeLaunchGap` usa `sessionStorage.cab_last_visibility_hidden` → `timeOrigin`. È **molto approssimativa**. Non usarla per attribuire miglioramenti al codice web.

## Criterio diagnostico (post-raccolta)

Calcolare mediane per scenario/route/device. Derivare soglie dai dati (es. rapporto > 2×).

```text
native_launch_gap >> web_startup + application_startup
  → problema fuori dal codice applicativo

web_startup + application_startup >> native_launch_gap
  → problema web/applicativo, ottimizzabile

static_boot_visible → first_useful_ui dominante in application_startup
  → analizzare bootstrap React/hydration/auth/bundle prima di manifest/SW
```

## Iterazione 2 (solo sul collo di bottiglia)

| Dominante | Approfondimento |
|-----------|-----------------|
| native launch gap | Device lento vs recente, process kill, PWA vs tab Chrome |
| web startup | Rete lenta (DevTools remote), cache fredda, breakdown TTFB |
| application startup | Provider mount profile, sequenza static→React, bundle |

## Aggregazione locale

```bash
node scripts/ops/android-cold-start-aggregate.mjs
```

Legge `test-results/android-cold-start/*.json` e produce `test-results/android-cold-start/summary.json`.

## Playwright proxy (emulazione, non sostituisce device)

```bash
NEXT_PUBLIC_BOOT_INVESTIGATION=1 PERF_USE_DEV=1 npx playwright test e2e/perf/android-pwa-cold-start.spec.ts -c e2e/perf/playwright.config.ts
```

Utile per verificare ordine marks e presenza report; **non** misura la splash nativa Android.

## Raccolta automatizzata (dev server)

```bash
NEXT_PUBLIC_BOOT_INVESTIGATION=1 npm run dev
# altro terminale:
node scripts/ops/boot-investigation-collect.mjs
```

Include `coldStartReport` quando disponibile.
