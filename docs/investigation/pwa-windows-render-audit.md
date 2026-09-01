# PWA Windows Render Audit

Generated: 2026-09-01  
Status: **in corso** — diagnosi only, nessun fix permanente autorizzato.

## Regola operativa

Modifiche permanenti **solo** dopo:

1. evidenza riproducibile browser tab vs PWA installata (stesso profilo Windows);
2. test A/B positivo sul componente/tecnica responsabile.

Fix Fase 4 nel piano = **candidati**, non soluzioni assunte.

---

## 1. Root cause

**Non determinata** — audit in corso.

| Ipotesi | Stato | Esito |
|---------|-------|-------|
| H1 Cache/build mismatch (`sw.js`, ETag, `_next/static`) | da verificare | |
| H2 `backdrop-filter` (toolbar, toast, modali) | da verificare | |
| H3 SVG `filter` / gradienti dashboard health score | da verificare | |
| H4 mask / clip-path / animazioni | da verificare | |
| H5 Bug compositor Chromium standalone + GPU | solo dopo H1–H4 | |

---

## 2. Evidenze

### 2.1 Parità build/cache (browser vs PWA)

Eseguire su **produzione**, stesso PC e profilo Chrome.

| Check | Browser tab | PWA standalone | Match? |
|-------|-------------|----------------|--------|
| Footer commit (`NEXT_PUBLIC_APP_COMMIT`) | | | |
| Build time | | | |
| SW controller URL | | | |
| `sw.js` SHA256 prefix (16 char) | | | |
| `sw.js` ETag | | | |
| `sw.js` Cache-Control | | | |
| `sw.js` Last-Modified | | | |
| Cache Storage names (`cab-pwa-*`) | | | |
| Hash chunk `/_next/static/` principali | | | |
| ETag/CSS/JS asset caricati | | | |

**Comandi console** (dopo deploy con `NEXT_PUBLIC_PWA_RENDER_AUDIT=1`):

```javascript
await window.__cabPwaRenderAudit?.()
await window.__cabPwaRenderCacheParity?.()
```

**Senza flag** — snippet manuale cache header:

```javascript
(async () => {
  const head = async (url) => {
    const r = await fetch(url, { cache: 'no-store' });
    return { url, status: r.status, etag: r.headers.get('etag'), cc: r.headers.get('cache-control'), lm: r.headers.get('last-modified') };
  };
  const staticUrls = performance.getEntriesByType('resource').map(e => e.name).filter(u => u.includes('/_next/static/') || u.endsWith('/sw.js'));
  return { sw: await head('/sw.js'), assets: await Promise.all([...new Set(staticUrls)].slice(0, 8).map(head)) };
})()
```

**Criterio esclusione H1**: tutte le righe Match = sì **e** difetto visivo persiste → H2+.

### 2.2 Snapshot capability

| Campo | Browser | PWA |
|-------|---------|-----|
| `navigator.userAgent` | | |
| `navigator.platform` | | |
| `devicePixelRatio` | | |
| `innerWidth` × `innerHeight` | | |
| `visualViewport.scale` | | |
| `display-mode: standalone` | false | true |
| `html.pwa-standalone` | | |
| CSS `backdrop-filter` support | | |
| CSS `color-mix` support | | |
| WebGL | | |

**Atteso**: UA/platform/DPR identici; differisce solo display-mode / classe `pwa-standalone`.

### 2.3 Test A/B DevTools (reversibile, non salvare)

Pagina primaria: `/dashboard`. Secondaria con toolbar: `/lavorazioni` o `/report`.

| Test | Override | Browser esito | PWA esito | Ipotesi se migliora solo PWA |
|------|----------|---------------|-----------|------------------------------|
| T1 | `.cab-page-toolbar-surface::before { backdrop-filter: none !important; }` | | | H2 toolbar |
| T2 | `[class*="backdrop-blur"] { backdrop-filter: none !important; }` | | | H2 globale |
| T3 | toast → rimuovi `backdrop-blur-md` | | | H2 toast |
| T4 | SVG dashboard → `filter: none !important` | | | H3 SVG filter |
| T5 | area chart → fill solido | | | H3 gradient |
| T6 | card → `opacity: 1`, rimuovi semitrasparenza | | | color-mix |
| T7 | HW accel off (Chrome flags) | | | **correlazione GPU only** |

**T7 — interpretazione**: se risolve il difetto → forte correlazione GPU/compositor. **Non** identifica il bug specifico. Obbligatorio completare T1–T6 per isolare la tecnica CSS/SVG.

Screenshot: allegare `browser-T{n}.png` e `pwa-T{n}.png`.

### 2.4 GPU / compositor

| Fonte | Browser | PWA | Note |
|-------|---------|-----|------|
| `chrome://gpu` — Compositing | | | |
| Hardware accelerated | | | |
| DevTools → Rendering → Layer borders | | | layer su health score / toolbar |

---

## 3. Componenti coinvolti (priorità audit)

| P | Componente | File | Tecnica |
|---|------------|------|---------|
| P0 | Health trend chart | `components/dashboard/dashboard-health-score-trend-chart.tsx` | SVG `drop-shadow`, `linearGradient` |
| P0 | Health score ring | `components/dashboard/dashboard-health-score-ring.tsx` | `color-mix` glow |
| P1 | Page toolbar | `app/globals-gestionale-shell.css` | `backdrop-filter: blur(12px)` |
| P1 | Toast | `lib/ui/design-system.ts` `dsToastItem` | `backdrop-blur-md` |
| P1 | Modal SSOT | `lib/ui/ios-mobile-tokens.ts` | `motion-safe:backdrop-blur` |
| P2 | Report charts | `components/report/report-charts.tsx` | SVG static |
| P2 | Client portal progress | `client-portal-stato-progress.css` | mask + gradient animato |

Probe page (deploy con flag): `/sicurezza/pwa-render-probe` con `NEXT_PUBLIC_PWA_RENDER_AUDIT=1`.

### Strumentazione implementata (2026-09-01)

| Asset | Path |
|-------|------|
| Gate | `lib/observability/pwa-render-audit-gate.ts` |
| Snapshot + cache parity | `lib/observability/pwa-render-diagnostics.ts` |
| Bridge (lazy) | `src/components/pwa-render-audit-bridge.tsx` |
| Probe UI | `components/ops/pwa-render-probe-panel.tsx` |
| Probe route | `app/(gestionale)/sicurezza/pwa-render-probe/page.tsx` |
| Policy test | `lib/regression/pwa-render-audit-policy.test.ts` |

**Deploy audit in prod**: impostare `NEXT_PUBLIC_PWA_RENDER_AUDIT=1` su Vercel → redeploy → aprire probe in browser tab e PWA → raccogliere JSON.

**Override runtime** (senza redeploy, sessione corrente): `window.__cabForcePwaRenderAudit = true` → reload gestionale.

---

## 4. Fix applicato

**Nessuno** — catena causale non ancora dimostrata (evidenze runtime Windows da raccogliere post-deploy).

---

## 5. Perché il fix sarebbe corretto

_N/A finché §4 vuoto._

---

## 6. Rischi / regressioni

Harness audit: zero impatto prod senza `NEXT_PUBLIC_PWA_RENDER_AUDIT=1`. Bridge montato in `ObservabilityDiagnosticsPack` ma `initPwaRenderDiagnostics()` no-op se flag assente.

---

## 7. Test finali

### Automatizzati (implementazione harness)

```bash
npx tsx lib/regression/pwa-render-audit-policy.test.ts   # OK
npx tsx lib/observability/pwa-render-diagnostics.test.ts # OK
npm run build                                            # OK (route /sicurezza/pwa-render-probe)
```

Playwright smoke (opzionale, flag richiesto):

```bash
NEXT_PUBLIC_PWA_RENDER_AUDIT=1 npx playwright test e2e/diag/pwa-render-probe.spec.ts
```

### Manuali Windows (obbligatori per root cause)

Vedi §2.1–2.4 — da eseguire post-deploy con flag audit.

---

## 8. Residual risk

Possibile limite Chromium/GPU su Windows in `display-mode: standalone` se H1–H4 esclusi e T7 correlato ma nessun T1–T6 positivo.

---

## Riferimenti codebase

- PWA detection: `lib/pwa/pwa-display-mode.ts`, `src/components/pwa-display-mode-bridge.tsx`
- SW cache: `lib/pwa/sw-runtime.ts`, `scripts/build-pwa-sw.ts`
- Nessun CSS compositor-specifico per `html.pwa-standalone` oggi (solo hook offset login)
- Grafici: SVG custom, nessuna libreria chart npm
