# Overflow P0 Remediation Report

Generated: 2026-06-17

## Scope

Remediation mirata su 5 componenti — **AppShell non modificato** (clip layer invariato; overflow contenuto localmente).

---

## File modificati

| File | Modifica |
|------|----------|
| [`components/preventivi/preventivi-editor-modal.tsx`](../components/preventivi/preventivi-editor-modal.tsx) | Rimosso `min-w-[960px]`; `dsTableFixed` + `colgroup` 7 colonne; wrap `min-w-0` |
| [`components/preventivi/preventivi-view.tsx`](../components/preventivi/preventivi-view.tsx) | Rimosso `masterScrollScope={false}`; cleanup `min-w-[*rem]` su th; search `min-w-0 flex-1` |
| [`components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx`](../components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx) | Shell: `overflow-hidden` → solo `min-w-0`; scroll container `min-w-0` |
| [`components/report/report-lavorazioni-section.tsx`](../components/report/report-lavorazioni-section.tsx) | Rimossi `min-w-[720px]` / `[480px]`; `colgroup` matrice + storico manuale; th `min-w-0` |
| [`components/report/report-magazzino-section.tsx`](../components/report/report-magazzino-section.tsx) | Rimosso `min-w-[720px]`; `w-full min-w-0`; wrap `min-w-0` |
| [`lib/regression/overflow-remediation-policy.test.ts`](../lib/regression/overflow-remediation-policy.test.ts) | **Nuovo** — guard statici |
| [`e2e/smoke/overflow-remediation.spec.ts`](../e2e/smoke/overflow-remediation.spec.ts) | **Nuovo** — 3 route × 6 viewport |
| [`scripts/ops/overflow-remediation-verify.mjs`](../scripts/ops/overflow-remediation-verify.mjs) | **Nuovo** — verify JSON |
| [`package.json`](../package.json) | Script `ops:overflow-remediation-verify` |

---

## Verifica statica

```bash
npx tsx lib/regression/overflow-remediation-policy.test.ts
# overflow-remediation-policy.test.ts OK
```

Controlli:

- Nessun `min-w-[960px]` in editor preventivi
- Nessun `masterScrollScope={false}` in preventivi-view
- Nessun `overflow-hidden` sulla shell timesheet
- Nessun `min-w-[720px]` / `[480px]` nelle sezioni report target

---

## Verifica runtime (6 viewport)

**Viewports:** 390, 724, 768, 1024, 1362, 1440  
**Route:** `/preventivi`, `/dipendenti`, `/report`

### Comando

```bash
# Terminal 1
npm run dev

# Terminal 2 (.env.local con SMOKE_ADMIN_EMAIL/PASSWORD)
npm run ops:overflow-remediation-verify
# oppure
npx playwright test e2e/smoke/overflow-remediation.spec.ts
```

**Criterio:** `document.scrollWidth <= clientWidth + 2`, shell e main ok (helper [`e2e/helpers/horizontal-overflow.ts`](../e2e/helpers/horizontal-overflow.ts)).

### Stato raccolta

Runtime verify non eseguita in questa sessione: dev server non attivo e `SMOKE_ADMIN_*` assenti in `.env.local`. Ripetere i comandi sopra per JSON in `test-results/overflow-remediation-verify.json`.

---

## Overflow eliminato (per componente)

| Componente | Prima | Dopo |
|------------|-------|------|
| **PreventiviEditorModal** | Tabella forzata 960px → bleed modale | `table-fixed` + `min-w-0`; scroll solo in `dsTableWrap` |
| **PreventiviView** | Tabella senza scroll scope SSOT; th doppio min-width | `gestionale-list-table-scope` attivo; colonne da colgroup |
| **DipendentiTimesheetGrid** | Shell `overflow-hidden` tagliava scroll interno | Shell `min-w-0`; scroll in `.timesheet-presenze-grid` |
| **ReportLavorazioniSection** | Matrice min 720px + th floor; storico 480px | `w-full min-w-0` + colgroup; scroll in `globalTableWrap` |
| **ReportMagazzinoSection** | Tabella min 720px ridondante | `w-full min-w-0` con colgroup % esistente |

---

## Overflow intenzionali rimasti (by design)

| Area | Motivo |
|------|--------|
| **Timesheet grid** | `style={{ minWidth: tableWidthRem }}` (~97rem / 31 gg) — scroll orizzontale dentro `.timesheet-presenze-grid` |
| **Tabelle report** | Scroll interno `globalTableWrap` / `dsTableWrap` se main stretto |
| **Editor preventivi ricambi** | Scroll interno modale su colonne input strettissime |
| **AppShell** | `overflow-hidden` invariato — non genera larghezza, maschera bleed residuo |

---

## Rischi residui

- **Desktop ≥1280px:** layout tabella invariato via `table-fixed` + colgroup; verificare visivamente colonne Preventivi/Report.
- **Modale editor @ 390px:** scroll orizzontale nella sezione ricambi è accettabile (regione scroll etichettata).
- **Audit root-cause autenticato:** opzionale con `NEXT_PUBLIC_OVERFLOW_ROOT_CAUSE_AUDIT=1` + `ops:overflow-audit-collect` post-login.

---

## Desktop UX

- Proporzioni colgroup allineate ai layout precedenti (preventivi editor 12/28/12…%; report matrice 8/6/8%).
- Sticky colonna Azioni preventivi riattivata (`masterScrollScope` default).
- Nessuna modifica a card mobile / tier layout `xl` su Preventivi.
