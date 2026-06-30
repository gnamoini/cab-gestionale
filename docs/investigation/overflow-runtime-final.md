# Overflow Runtime Final — Root Cause @ 724px

Generated: 2026-06-17

Diagnosi only — **nessun fix applicato** in questa sessione.

## Metodo

| Step | Dettaglio |
|------|-----------|
| Dev server | `NEXT_PUBLIC_OVERFLOW_ROOT_CAUSE_AUDIT=1 npm run dev` |
| Viewport | **724×900** (mobile shell tier) |
| Sessione | Cookie auth export → Playwright headless + verifica Cursor browser |
| Route | 12 admin SSOT (collect script) |
| Audit | `window.__cabOverflowAudit()` + probe esteso (chain DOM, promote-to-root, portali/fixed) |
| Artefatti | [`test-results/overflow-runtime-final.json`](../test-results/overflow-runtime-final.json), [`test-results/overflow-runtime-summary.json`](../test-results/overflow-runtime-summary.json) |

---

## Scansione documento (724px — tutte le route)

| Metrica | Risultato 12/12 route |
|---------|----------------------|
| `document.documentElement.scrollWidth` | **724** (= `innerWidth`) |
| `document.body.scrollWidth` | **724** |
| `hasDocumentOverflow` | **false** |
| `viewportOverflowPx > 0` | **0 route** |
| `mainClipPx > 0` (root culprits) | **0 route** |
| Shell tier | **mobile** |

**Conclusione scansione:** la condizione `scrollWidth > innerWidth` **non si verifica** a 724px su nessuna pagina admin nel runtime attuale (post remediation P0).

---

## Chain shell (campione — identico su tutte le route)

| Nodo | scrollWidth | clientWidth | right | overflowPx | mainClipPx |
|------|-------------|-------------|-------|------------|------------|
| `documentElement` | 724 | 724 | 724 | 0 | 0 |
| `body` | 724 | 724 | 724 | 0 | 0 |
| `.cab-app-shell` | 724 | 724 | 724 | 0 | 0 |
| `main.gestionale-scroll-y` | 724 | 724 | 724 | 0 | 0 |
| page container (`dsGestionaleContentMax`) | 724 | 724 | 724 | 0 | 0 |

`.cab-gestionale-scroll-gutter-mirror`: `overflowPx: 0`, `--cab-main-scrollbar-inset` vuoto @ mobile.

---

## Probe elementi invisibili (`/preventivi`, `/dashboard`)

| Target | Esito @ 724px |
|--------|----------------|
| `body > *` | Solo `.cab-app-shell` visibile (724px); script Next `display:none` |
| `[data-cab-modal-root]`, `[role=dialog]` | **0** montati con overflow |
| `.fixed` (sidebar mobile) | `display: none` (shell compatta) — `overflowPx: 0` |
| Drawer nav chiuso | Nessun bleed |
| Portali toast | Nessun `overflowPx > 0` |

---

## Root culprits audit (solo 2 route con hit — non clip shell)

### `/report` — scroll interno intenzionale (non main-clip)

| Campo | Valore |
|-------|--------|
| Componente | `ShellCard` → `ReportLavorazioniSectionInner` |
| File | [`components/report/report-lavorazioni-section.tsx`](../components/report/report-lavorazioni-section.tsx) |
| Selector | `div.min-w-0.max-w-full.overflow-x-auto.rounded-[var(--ds-radius-xl)]` |
| Kind | **internal** (157px) |
| viewportOverflowPx | **0** |
| mainClipPx | **0** |
| CSS | `width: 620px`, `min-width: 0`, `overflow-x: auto` |
| Perché | Tabella matrice più larga del card; scroll **dentro** il wrapper `overflow-x-auto` — contenuto **non** eccede `main` |

### `/dashboard/security` — rumore interno 2px (icon spinner)

| Campo | Valore |
|-------|--------|
| Componente | `Tooltip` / `GestionaleRefreshToolbarButton` |
| File | [`components/gestionale/page-header-toolbar.tsx`](../components/gestionale/page-header-toolbar.tsx) |
| overflowPx | 2px internal |
| mainClipPx | **0** |

---

## Raw hits senza root cause clip (falsi positivi audit)

| Route | rawHitCount | Nota |
|-------|-------------|------|
| `/mezzi` | 218 | Quasi tutti `span.sr-only` — testo screen-reader in box 1px, `scrollWidth` alto ma `rect.right` dentro viewport |
| `/lavorazioni` | 48 | Tutti **intentionalScroll** (kanban scope) |
| `/lavorazioni-clienti` | 277 | intentional scroll scope |
| `/report` | 23 | 22 intentional scroll |

---

## Verifica extra: desktop 1440px

Su `/preventivi`, `/magazzino`, `/lavorazioni` @ **1440px**: tier desktop/tablet, **nessun** `mainClipPx` o `viewportOverflowPx` nei root culprits.

---

# ROOT CAUSE

## Globale (clipping percepito “su tutte le pagine” @ 724px)

**componente:** _Nessun generatore di larghezza attivo_

**file:** n/a

**CSS responsabile:** n/a (nessun antenato supera `main` o viewport nel runtime misurato)

**pixel fuori viewport:** **0** (document/body/main/right chain tutti a 724px)

**perché succede (percezione clip vs misura):**

1. **Remediation P0 efficace** — a 724px non resta bleed misurabile oltre viewport/main su 12/12 route.
2. **Clip layer presente ma inattivo** — [`.cab-app-shell { overflow-hidden }`](../components/gestionale/app-shell.tsx) + [`html/body { overflow: hidden }`](../app/globals.css) **amplificano** eventuali bleed ma **non** risultano triggerati nel DOM misurato.
3. **Se il clipping è ancora visibile nel preview Cursor**, cause probabili **non catturate** da `scrollWidth > innerWidth`:
   - **Preview IDE** — finestra esterna larga vs pannello stretto: verificare `data-gestionale-shell-tier`, `--cab-shell-content-width`, e tier lista (`useGestionaleListLayout`) con DevTools nel preview reale.
   - **Clip visivo** — ombre, ring focus, border-radius tagliati da `overflow-hidden` senza superare metriche layout.
   - **Stato UI diverso** — modale aperta, drawer aperto, dati tabella popolati vs empty state (preventivi vuoto in questa sessione).
   - **Cache bundle** — hard refresh dopo remediation.

**Colpevole reale layout @ 724px:** **non identificato** — il runtime non conferma un antenato che espande oltre 724px.

---

## Per-route (unici hit audit)

### Report — matrice lavorazioni

```
ROOT CAUSE:
componente: ReportLavorazioniSectionInner (ShellCard wrapper)
file: components/report/report-lavorazioni-section.tsx
CSS responsabile: overflow-x-auto su card 620px; tabella 776px scrollWidth
pixel fuori viewport: 0 viewport / 0 main-clip (157px internal scroll)
perché succede: scroll orizzontale designato dentro card; non bleed shell
```

### Dashboard/security — toolbar spinner

```
ROOT CAUSE:
componente: GestionaleRefreshToolbarButton (Tooltip inner)
file: components/gestionale/page-header-toolbar.tsx
CSS responsabile: flex nowrap 16px box, scrollWidth 19px
pixel fuori viewport: 0 (2px internal — non clip utente)
perché succede: micro-overflow icona; irrilevante per clipping pagina
```

---

## Tabella riepilogo 724px

| Route | doc overflow | main-clip culprits | viewport culprits |
|-------|--------------|--------------------|-------------------|
| /dashboard | no | 0 | 0 |
| /lavorazioni | no | 0 | 0 |
| /lavorazioni-clienti | no | 0 | 0 |
| /preventivi | no | 0 | 0 |
| /documenti | no | 0 | 0 |
| /magazzino | no | 0 | 0 |
| /mezzi | no | 0 | 0 |
| /dipendenti | no | 0 | 0 |
| /bunder | no | 0 | 0 |
| /report | no | 0 | 0 |
| /impostazioni | no | 0 | 0 |
| /dashboard/security | no | 0 | 0 |

---

## Raccomandazioni (diagnosi — no fix)

1. **Riprodurre nel preview Cursor esatto** con DevTools: `window.__cabOverflowAudit()` + verificare se `mainClipPx > 0` quando il clip è visibile.
2. Se `mainClipPx === 0` ma clip visibile → investigare **clip visivo** (overflow-hidden su shell/main) non layout width.
3. Se `mainClipPx > 0` solo in preview IDE → correlare con `resolveGestionaleShellContentWidth()` / tier lista desktop in pannello stretto.
4. **Non** applicare fix finché un run audit nel momento del clip non identifica un colpevole con `viewportOverflowPx` o `mainClipPx` > 0.

---

## File coinvolti (investigazione)

| Artefatto | Path |
|-----------|------|
| JSON completo | `test-results/overflow-runtime-final.json` |
| Summary | `test-results/overflow-runtime-summary.json` |
| Probe script | `test-results/overflow-runtime-probe-snippet.js` |
| Collect | `test-results/overflow-runtime-final-collect.mjs` |
| Audit core | `lib/observability/overflow-root-cause-audit.ts` |

**Nessuna modifica al codice applicazione in questa sessione.**
