# Static Overflow Investigation

Generated: 2026-06-17 (repository-wide grep + manual classification)

**Method:** scan `components/**`, `app/**`, `lib/**` for width/overflow patterns. No runtime auth required.

**Viewport reference (main content width approx.):**

| Viewport | Sidebar | Main usable |
|----------|---------|-------------|
| 390 | hidden | ~390px |
| 724 | collapsed 4.25rem | ~620px |
| 724 | expanded 12.75rem | ~520px |
| 768–1024 | mixed | ~500–900px |
| 1362+ | expanded | ~1150px |

**Clip amplifier:** `.cab-app-shell { overflow-hidden }` — bleed oltre `main` viene tagliato anche senza scroll document.

---

## Pattern counts (indicative)

| Pattern | Matches (tsx/ts/css) |
|---------|---------------------|
| `min-w-[` | ~90+ across 50+ files |
| `flex-nowrap` | ~35 across 25+ files |
| Table `min-w-[480–960px]` | 14 table declarations |
| `overflow-x-auto` (intentional) | ~20 scopes |

---

## Top 20 — componenti più pericolosi

Ordinati per probabilità di causare **clipping percepito** (non scroll interno designato).

### 1. P0 — `AppShell` (`components/gestionale/app-shell.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `overflow-hidden`, `max-w-full`, sidebar `w-[12.75rem]`, main `md:pl-[12.75rem]` |
| Viewport min | Qualsiasi — amplifica tutti gli overflow figli |
| Rischio | **Clip layer**: contenuto più largo di `main` tagliato senza scroll pagina |

### 2. P0 — `PreventiviEditorModal` (`components/preventivi/preventivi-editor-modal.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `<table className="… min-w-[960px]">` righe ricambi |
| Viewport min | **960px** nella modale |
| Rischio | Su mobile/tablet modale full-bleed (~390–724px) la tabella eccede ~236–570px; wrap `dsTableWrap` mitiga solo se scroll interno attivo e non bloccato da parent `overflow-hidden` |

### 3. P0 — `DipendentiTimesheetGrid` (`components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` + `lib/dipendenti/timesheet-grid-layout.ts`)

| Campo | Valore |
|-------|--------|
| Match | `min-w-[2.75rem]` × N giorni + name 6.5rem + total 4.5rem → **~1552px** (31 giorni) |
| Viewport min | **~1552px** senza scroll |
| Rischio | Generatore larghezza massimo del gestionale; ha `overflow-x-auto` sul wrapper — P0 se catena `min-w-0` rotta verso shell |

### 4. P0 — `PreventiviView` (`components/preventivi/preventivi-view.tsx`)

| Campo | Valore |
|-------|--------|
| Match | 12 colonne `w-[5.25rem]`…`w-[10.5rem]` + `%`; `masterScrollScope={false}`; toolbar `sm:min-w-[12rem]` |
| Viewport min | **~750–900px** layout desktop tabella |
| Rischio | `masterScrollScope={false}` → niente `gestionale-list-table-scope`; colonna azioni + `%` forzano larghezza; desktop attivo fino a breakpoint lista (~1024 container) |

### 5. P1 — `ReportLavorazioniSection` (`components/report/report-lavorazioni-section.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `min-w-[720px]` matrice anni/mesi + `min-w-[480px]` storico manuale |
| Viewport min | **720px** |
| Rischio | In `globalTableWrap` — overflow condizionale; su 724px con sidebar ~520px main → scroll interno o clip shell |

### 6. P1 — `ReportMagazzinoSection` (`components/report/report-magazzino-section.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `min-w-[720px] table-fixed` |
| Viewport min | **720px** |
| Rischio | Stesso pattern report |

### 7. P1 — `ReportRicambiConsumoSection` (`components/report/report-ricambi-consumo-section.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `min-w-[720px]` + filtri `min-w-[12rem]` / `min-w-[8rem]` |
| Viewport min | **720px** tabella |
| Rischio | Toolbar filtri + tabella wide |

### 8. P1 — `ReportTops` (`components/report/report-tops.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `min-w-[640px]`, `min-w-[36rem]` (576px), `min-w-[28rem]` (448px); colonne `min-w-[10rem]`+ |
| Viewport min | **576–640px** per tabella clienti |
| Rischio | Wrappate in `dsTableWrap` — P1 su tablet stretto / preview IDE 724px |

### 9. P1 — `BunderEditorModal` (`components/bunder/bunder-editor-modal.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `min-w-[720px]` tabella; celle `min-w-[12rem]` |
| Viewport min | **720px** |
| Rischio | Editor modale analogo preventivi |

### 10. P1 — `SchedeLavorazioneModal` (`components/lavorazioni/schede/schede-lavorazione-modal.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `flex-nowrap` (6×), header `min-w-[28rem]`, `min-w-[12rem]`, `min-w-[10rem]` |
| Viewport min | **~448–640px** righe toolbar interne |
| Rischio | Modale hub — righe azioni non wrap su `< sm` |

### 11. P1 — `gestionaleListColAzioniClass` (`lib/ui/gestionale-list-table.ts`)

| Campo | Valore |
|-------|--------|
| Match | `w-[11.5rem] min-w-[11.5rem]` colonna Azioni sticky |
| Viewport min | **+184px** su ogni tabella lista |
| Rischio | SSOT Lavorazioni/Magazzino/Mezzi — somma colonne + azioni |

### 12. P1 — `PageToolbar` + `ToolbarGroup` (`components/design-system/page-toolbar.tsx`, `toolbar-group.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `flex-nowrap` (8+), `sm:min-w-[12rem]` search wrapper, `ToolbarGroupSearchRow flex-nowrap` |
| Viewport min | **~500px** riga CTA+search+filtri |
| Rischio | Usato in Preventivi, Magazzino, Mezzi, Documenti, Bunder, Lavorazioni — toolbar eccede main prima della tabella |

### 13. P1 — `LavorazionePreventiviHubList` (`components/lavorazioni/schede/lavorazione-preventivi-hub-list.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `masterScrollScope={false}`; colonne `min-w-[9.75rem]`+ |
| Viewport min | **~600px** |
| Rischio | Tabella inside modale schede |

### 14. P1 — `MagazzinoView` (`components/gestionale/magazzino/magazzino-view.tsx`)

| Campo | Valore |
|-------|--------|
| Match | 10 colonne `%` + `7.75rem`; toolbar; `flex-nowrap` in view |
| Viewport min | **~900px** desktop table |
| Rischio | Lista densa + toolbar |

### 15. P1 — `LavorazioneDetailModal` (`components/gestionale/lavorazioni/lavorazione-detail-modal.tsx`)

| Campo | Valore |
|-------|--------|
| Match | 2× `min-w-[520px]` tables |
| Viewport min | **520px** |
| Rischio | Modale dettaglio su mobile |

### 16. P1 — `MezziHubDetailModal` (`components/gestionale/mezzi/mezzi-hub-detail-modal.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `min-w-[640px]`; `flex-nowrap` header |
| Viewport min | **640px** |
| Rischio | Hub modale mezzi |

### 17. P2 — `ReportLavorazioniTemporalSection` (`components/report/report-lavorazioni-temporal-section.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `min-w-[520px]` in `globalTableWrap` |
| Viewport min | **520px** |
| Rischio | Mitigato da wrap |

### 18. P2 — `LavorazioniKanbanView` (`components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `w-max min-w-full`; board `overflow-x-auto` |
| Viewport min | Scroll intenzionale colonne kanban |
| Rischio | P2 — overflow designato; outer `overflow-x-hidden` può mascherare scrollbar |

### 19. P2 — `ReportControls` (`components/report/report-controls.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `overflow-x-auto` segmented; `sm:min-w-[10.5rem]` / `[11.5rem]` |
| Viewport min | **~400px** controlli |
| Rischio | Scroll interno preset periodo |

### 20. P2 — `GlobalSelect` tokens (`lib/ui/global-input.ts`, `global-select.tsx`)

| Campo | Valore |
|-------|--------|
| Match | `min-w-[13rem] w-52`; combobox trigger |
| Viewport min | **208px** per campo |
| Rischio | In toolbar affiancati — contributo cumulativo P2 |

---

## Altre aree (P2 / condizionali)

| Componente | Pattern | Note |
|------------|---------|------|
| `dashboard-promemoria-calendar.tsx` | `flex-nowrap`, picker `min-w-[13.5rem]` | Dashboard cards |
| `dashboard-operational-cards.tsx` | `whitespace-nowrap` | Card metriche |
| `settings-list-ui.tsx` | `sm:flex-nowrap`, grid `15rem` sidebar | Impostazioni |
| `timesheet-header.tsx` | `min-w-[9rem]`, `flex-nowrap` | Header griglia dipendenti |
| `dsTableWrapDesktopFit` | `xl:overflow-x-hidden` | **Definito ma non usato** — rischio se adottato |
| `bunder-view.tsx` | lista + toolbar come preventivi | Stesso profilo P1 |

---

## Sintesi per categoria (attenzione richiesta)

| Categoria | Verdetto statico |
|-----------|------------------|
| **Tabelle** | 14 tabelle con `min-w` 480–960px; report e editor modali i più larghi |
| **Editor preventivi** | **P0** — `960px` hard floor |
| **Toolbar** | **P1** — `flex-nowrap` + `sm:min-w-[12rem]` × (search + filtri + CTA) |
| **Dashboard cards** | P2 — nowrap locali, raramente > viewport |
| **Shell layout** | **P0 clip** — `overflow-hidden` su shell |
| **Modali** | P0/P1 — tabelle wide senza garantire scroll body modale |
| **Bottom sheet / select** | P2 — dropdown portal; trigger `w-52` in row nowrap |
| **Autocomplete** | P2 — portal; rischio in toolbar affollata |

---

## Prossimo passo (runtime)

Confermare i 5 primi con audit autenticato:

```bash
# .env.local: SMOKE_ADMIN_EMAIL/PASSWORD
NEXT_PUBLIC_OVERFLOW_ROOT_CAUSE_AUDIT=1 npm run dev
npm run ops:overflow-audit-collect && npm run ops:overflow-audit-report
```

Priorità route: `/preventivi`, `/report`, `/dipendenti`, `/magazzino`, `/lavorazioni` @ 390/724px.
