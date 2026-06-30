# Visual Clip Root Cause — @ 724px

Generated: 2026-06-17

Diagnosi only — **nessun fix applicato** a `components/`, `lib/`, `app/`, `package.json`.

## Metodo

| Step | Dettaglio |
|------|-----------|
| Premessa | [`overflow-runtime-final.md`](overflow-runtime-final.md): `scrollWidth === innerWidth === 724` su 12/12 route — **non** ripetuto audit width overflow |
| Probe | [`test-results/visual-clip-probe-snippet.js`](../../test-results/visual-clip-probe-snippet.js) — parent clip pairs, fixed/absolute, visual bleed (paint), viewport context |
| API console | `window.__cabVisualClipAudit()`, `__cabVisualClipDebugOn()` / `__cabVisualClipDebugOff()` |
| Viewport | **724×900**, shell tier **mobile** |
| Collect | Playwright headless + cookie session → [`test-results/visual-clip-runtime.json`](../../test-results/visual-clip-runtime.json) |
| Verifica IDE | Cursor browser @ 724px su `/magazzino` — viewport probe |
| Analisi | [`test-results/analyze-visual-clip-runtime.mjs`](../../test-results/analyze-visual-clip-runtime.mjs) → [`test-results/visual-clip-summary.json`](../../test-results/visual-clip-summary.json) |
| Screenshot | 12 route con outline debug quando `rawClipHitCount > 0` → `test-results/visual-clip-*.png` |

---

## Viewport probe (724px)

| Campo | Playwright 12/12 | Cursor browser (`/magazzino`) |
|-------|------------------|-------------------------------|
| `innerWidth` | 724 | 724 |
| `docClientWidth` | 724 | 724 |
| `visualViewport.width` | 724 | 724 |
| `frameWidth` | null | null |
| `devicePixelRatio` | 1 | 1 |
| `shellTier` | mobile | mobile |
| `--cab-safe-left/right` | 0px | 0px |
| `bodyPaddingLeft/Right` | 0 | 0 |

**Conclusione viewport:** nessun mismatch misurabile tra frame IDE, visualViewport e layout width. Il clip percepito **non** deriva da `scrollWidth > innerWidth` né da safe-area asimmetrica @ 724px.

---

## Shell clip layer (presenti vs attivi)

| Layer | Presente 12/12 | Trigger layout orizzontale | Trigger paint decorativo |
|-------|----------------|------------------------------|--------------------------|
| `html/body overflow: hidden` | sì | no (0px left/right) | no |
| `.cab-app-shell overflow-hidden` (H1) | sì | no | no (solo clip verticale scroll — atteso) |
| `main.gestionale-scroll-y overflow-x: hidden` (H2) | sì | no | **sì** — ombre toolbar/header figli |
| `.cab-gestionale-scroll-gutter-mirror overflow: hidden` (H3) | header | no | **sì** — ombre bottoni header |
| `.cab-ios-sticky-header` + `backdrop-blur` (H4) | header | no | stacking context; bleed toolbar tagliato da antenati |
| Body safe-area (H5) | 0px | no | no |
| IDE `frameElement` (H6) | null | no | no |

---

## Ipotesi statiche — esito

| ID | Sospetto | Esito @ 724px |
|----|----------|---------------|
| H1 | Shell `overflow-hidden` | **Presente, inattivo orizzontalmente** — clip solo verticale del contenuto scrollabile |
| H2 | Main `overflow-x: hidden` | **Attivo su paint** — taglia ~12px box-shadow su controlli header/toolbar |
| H3 | Header gutter mirror | **Root cause paint globale** — 11/12 route |
| H4 | Sticky header blur/transform | **Contribuisce** — `backdrop-filter` su header; bleed toolbar su wrapper `backdrop-filter` |
| H5 | Safe-area padding | **Smentito** — 0px |
| H6 | Preview frame ≠ innerWidth | **Smentito nel runtime** — `frameWidth: null`, metriche allineate a 724 |

---

## Aggregazione globale (criterio ≥8/12 route, delta visivo >1px)

| Tipo | Conteggio |
|------|-----------|
| Root clippers con overflow **orizzontale** layout | **0** |
| Visual bleed **paint** tagliato da antenato | **6 pattern globali** |
| Fixed/absolute fuori viewport orizzontale | **0** |

Il clipping misurato è **paint-only** (box-shadow ~12px, ring/outline), non espansione layout oltre 724px.

---

# VISUAL CLIP ROOT CAUSE

## 1 — Header gutter mirror (primario, 11/12 route)

```
VISUAL CLIP ROOT CAUSE

elemento: div.cab-gestionale-scroll-gutter-mirror.w-full.min-w-0
componente: AppShell header wrapper (GestionaleShellLayoutProvider / app-shell.tsx)
parent clipping: div.cab-gestionale-scroll-gutter-mirror — overflow: hidden
CSS: overflow: hidden; scrollbar-gutter: auto; padding-inline-end: var(--cab-main-scrollbar-inset, 0px)
motivo: paint — box-shadow (~12px) dei bottoni header (menu drawer, AccountMenu) estende oltre il padding box del mirror; tagliato senza aumentare scrollWidth. Visibile @ 724px mobile su bordo sinistro/destro header.
```

**File:** [`components/gestionale/app-shell.tsx`](../../components/gestionale/app-shell.tsx) (wrapper L704), [`app/globals.css`](../../app/globals.css) L580–585.

**Figli tipici:** bottone nav drawer (`data-testid="smoke-nav-drawer-open"`, shadow `var(--cab-shadow-sm)`), `AccountMenu` trigger.

**Screenshot:** [`test-results/visual-clip-dashboard.png`](../../test-results/visual-clip-dashboard.png), [`test-results/visual-clip-lavorazioni.png`](../../test-results/visual-clip-lavorazioni.png)

---

## 2 — Main overflow-x orizzontale (8/12 route)

```
VISUAL CLIP ROOT CAUSE

elemento: main.gestionale-scroll-y.gestionale-scrollbar.w-full.gestionale-responsive-core
componente: AppShell main scroll host
parent clipping: main.gestionale-scroll-y — overflow-x: hidden (overflow-y: auto)
CSS: overflow-x: hidden; max-width: 100%
motivo: paint — ombre/ring su NotificationBellTrigger, Tooltip refresh e controlli header destra sporgono ~12px; main le taglia. Layout width resta 724px; nessun document overflow.
```

**File:** [`app/globals.css`](../../app/globals.css) L546–549, [`components/gestionale/app-shell.tsx`](../../components/gestionale/app-shell.tsx) (main column).

**Screenshot:** [`test-results/visual-clip-impostazioni.png`](../../test-results/visual-clip-impostazioni.png)

---

## 3 — ShellCard / sezione overflow-x-clip (9/12 route)

```
VISUAL CLIP ROOT CAUSE

elemento: div.min-w-0.max-w-full.overflow-x-clip (wrapper lista/card)
componente: ShellCard / sezioni pagina lista
parent clipping: wrapper overflow-x-clip — overflow: hidden (asse x)
CSS: overflow-x: clip; min-w-0; max-w-full
motivo: paint — border-radius + border/shadow della section ShellCard (~12px decor) tagliati dal wrapper intenzionale anti-bleed; percepito come card “mangiata” ai bordi su preview stretto.
```

**File:** [`components/gestionale/shell-card.tsx`](../../components/gestionale/shell-card.tsx).

**Screenshot:** [`test-results/visual-clip-report.png`](../../test-results/visual-clip-report.png)

---

## 4 — Toolbar backdrop-filter stacking (8/12 route)

```
VISUAL CLIP ROOT CAUSE

elemento: div.relative.min-w-0.max-w-full.rounded-[var(--ds-radius-xl)] (ToolbarGroupPrimaryRow)
componente: ToolbarGroupPrimaryRow / PageToolbarResultCount
parent clipping: stesso nodo o antenato con backdrop-filter / transform — clip stacking context
CSS: backdrop-filter (blur) + rounded container; figli con shadow-* tagliati ~12px
motivo: paint — blur crea containing block per paint; badge/contatori e bottoni toolbar perdono alone/shadow ai bordi del gruppo.
```

**File:** [`components/design-system/toolbar-group.tsx`](../../components/design-system/toolbar-group.tsx), [`components/design-system/page-toolbar.tsx`](../../components/design-system/page-toolbar.tsx).

---

## 5 — Shell overflow-hidden verticale (12/12 — atteso, non width)

```
VISUAL CLIP ROOT CAUSE

elemento: div.cab-app-shell.flex.min-h-0…
componente: AppShell root
parent clipping: .cab-app-shell — overflow: hidden (tutti gli assi)
CSS: overflow-hidden su shell + html/body
motivo: layout verticale — contenuto main più alto del viewport (~500–10000px bottom delta) clipato per design; scroll delegato a main.gestionale-scroll-y. Non spiega clip orizzontale; spiega perché rawClipHitCount > 0 su ogni route negli screenshot debug.
```

**Nota:** promosso come root clipper con delta **bottom** dominante; **escluso** come colpevole width @ 724px.

---

## Falsi clip (esclusi)

| Segnale | Esito |
|---------|--------|
| `scrollWidth > innerWidth` | Mai @ 724px |
| Safe-area asimmetrica | 0px |
| `frameWidth ≠ innerWidth` | null in Cursor e Playwright |
| Fixed sidebar mobile | `display: none` — nessun bleed |
| Foglie testo (`span`) | Non promosse — solo antenati clipping |

---

## Verdict finale @ 724px

1. **Non esiste** un antenato che espande il layout oltre 724px (conferma overflow-runtime-final).
2. Il clipping **visivamente percepito** nel preview Cursor @ 724px è spiegato da **paint clip** su layer shell sempre presenti:
   - **#1** `.cab-gestionale-scroll-gutter-mirror { overflow: hidden }` — header, 11/12 route
   - **#2** `main { overflow-x: hidden }` — controlli header/toolbar, 8/12
   - **#3–4** wrapper card/toolbar — bleed decorativo ~12px, 8–9/12
3. Remediation width P0 resta valida; eventuali fix futuri riguarderebbero **ombre vs overflow-hidden** (non min-width/scroll bleed).

---

## Artefatti

| File | Contenuto |
|------|-----------|
| [`test-results/visual-clip-probe-snippet.js`](../../test-results/visual-clip-probe-snippet.js) | Probe + debug outline |
| [`test-results/visual-clip-runtime.json`](../../test-results/visual-clip-runtime.json) | 12 sessioni raw |
| [`test-results/visual-clip-summary.json`](../../test-results/visual-clip-summary.json) | Aggregazione |
| [`test-results/visual-clip-*.png`](../../test-results/) | Screenshot con outline rosso/arancio |
| [`test-results/visual-clip-collect.mjs`](../../test-results/visual-clip-collect.mjs) | Collect Playwright |

---

## Modifiche codice applicativo

**Zero.** Solo file in `test-results/` e `docs/investigation/`.
