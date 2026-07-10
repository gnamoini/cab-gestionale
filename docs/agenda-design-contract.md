# Agenda Design Contract

Documento vincolante per la pagina `/agenda`. Congelato in PR-0 — ogni modifica UI deve rispettare queste regole.

## Layout ufficiale

```
PageHeader

ShellCard
 ├── PageToolbar
 │    ├── Filters (collassabili)
 │    ├── ViewSwitcher (max 3 primarie)
 │    ├── Actions (overflow: Gantt, Analisi)
 │    └── primaryAction (unica CTA)
 │
Planner Layout
 ├── Calendar (navigazione)
 ├── Timeline / Vista attiva
 └── Intelligence (collassabile, chiusa di default)
```

## Regole vincolanti

| Regola | Dettaglio |
|--------|-----------|
| Una superficie insight | Solo sidebar/drawer Analisi |
| Una superficie suggerimenti | Auto-scheduler = motore unico (Analisi → Proposte) |
| Una CTA primaria | `dsPageToolbarCtaCompact` in `PageToolbar.primaryAction` |
| Max 3 viste primarie | Giorno \| Settimana \| Mese — Gantt e Analisi in overflow |
| No varianti locali DS | Se esiste componente DS, Agenda non crea wrapper custom |
| Sidebar Analisi | Chiusa di default; `useCollapsiblePreference` scope `agenda-analysis-panel` |
| DnD legacy | `ENABLE_AGENDA_LEGACY_DND_LAYER` fino a PR-4 cleanup |
| URL sync sicuro | `lastSyncedUrlRef` — replace solo se URL diversa |
| No dashboardizzazione | Agenda = superficie operativa; KPI/analisi supportano l'azione |

### No dashboardizzazione

> Agenda è una superficie operativa. KPI e analisi devono supportare l'azione, non sostituirla.

**Consentito:** carico officina, capacità, conflitti, suggerimenti operativi.

**Non consentito:** widget KPI decorativi, grafici senza azione, heatmap sempre visibili, analisi aperta di default.

### URL sync — protezione loop

```ts
const lastSyncedUrlRef = useRef<string | null>(null);

function syncUrl(opts: AgendaHrefParams) {
  const next = buildAgendaHref({ ...current, ...opts });
  if (lastSyncedUrlRef.current === next) return;
  lastSyncedUrlRef.current = next;
  deferredRouterReplace(router, next, { scroll: false });
}
```

Parametri URL: `date`, `view`, `panel`, `event`, `workOrder`, `hourSlot`. Filtri client-side non in URL.

## Component audit (baseline PR-0)

| Componente Agenda | Equivalente DS | Azione |
|-------------------|----------------|--------|
| `AgendaToolbarShell` | `ShellCard` + `PageToolbar` | Rimosso — `ShellCard` diretto |
| `AgendaCapacityCard` | `dsSurfacePanelStatic` | PR-2 tokenizzare |
| `AgendaIntelligenceSidebar` | `Drawer` su mobile | PR-3 |
| `AgendaInsightsPanel` duplicato | unica istanza in Analisi | PR-1 |

## Inventario URL / deep-link

| Sorgente | Pattern | File |
|----------|---------|------|
| Base | `/agenda` | `agenda-links.ts` |
| Vista | `?view=day\|week\|month\|gantt` | `agenda-links.ts` |
| Legacy insight | `?view=insight` → redirect `?panel=insights` | PR-1 |
| Evento | `?event={id}` | notifiche, detail |
| Lavorazione | `?workOrder={id}` | `buildAgendaFromLavorazioneHref`, lavorazione-planning-panel |
| Panel analisi | `?panel=heatmap\|weeklyLoad\|autoScheduler\|insights` | sidebar |
| Heatmap drill | `?hourSlot={n}` | heatmap click |
| Redirect legacy | `/dashboard/agenda` → `/agenda` | `next.config.ts` |

## UX baseline (pre-migrazione, 2026-07-10)

Misurato da analisi codice + viewport 1366×768 stimato.

| KPI | Valore baseline | Target post-PR-3 |
|-----|-----------------|------------------|
| Controlli immediati visibili | 16 (4 filtri + 5 tab + CTA + cal toggle + oggi + 4 sidebar tab + heatmap overlay) | < 10 |
| CTA duplicate | 2 (toolbar + slot click) | 1 |
| Superfici insight | 2 (tab centrale + sidebar) | 1 |
| Superfici slot/suggerimenti | 3 (banner + auto-scheduler + heatmap nav) | 1 |
| Viste primarie toolbar | 5 | 3 |
| Scroll iniziale vista Giorno | ~3 pannelli stacked (capacity + timeline + DnD duplicato) | ridotto |

### Screenshot baseline

Catturare manualmente o via `e2e/visual` prima del merge PR-1:

- Desktop 1920, 1440, 1366
- Tablet 768 portrait
- Mobile 375

Path suggerito: `docs/agenda-baseline-screenshots/` (non versionato se pesante).

## Performance baseline (pre-migrazione)

| Metrica | Baseline stimata | Target |
|---------|------------------|--------|
| Query React Query al mount | 2 (`useWorkshopScheduleRange`, `useWorkshopScheduleDayCapacity`) | ≤ 2 |
| Tempo apertura `/agenda` | da misurare DevTools | < 2s |
| Cambio giorno percepito | refetch range + re-render intelligence | < 300ms |
| Render timeline | virtualizer `@tanstack/react-virtual` | no full rerender su date change |
| Stress 50+ sessioni/giorno | scroll timeline max 640px | fluido |

## Gate PR-2.5 checklist

Prima di PR-3, verificare:

- [ ] Nessuna sessione duplicata (vista Giorno, 5+ sessioni)
- [ ] URL deep-link invariati (inventario sopra)
- [ ] RBAC write vs readonly
- [ ] Creazione sessione (CTA + slot)
- [ ] Modifica sessione (detail → modal)
- [ ] Mobile 375px + tablet
- [ ] ShellCard + PageToolbar + CTA token
- [ ] Performance open < 2s, cambio giorno < 300ms
