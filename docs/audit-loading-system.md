# Audit — Sistema loading e skeleton

Ultimo aggiornamento: standardizzazione skeleton a contenitore unico.

## SSOT

- Componenti: [`components/design-system/loading/`](../components/design-system/loading/)
- Token: [`loading-tokens.ts`](../components/design-system/loading/loading-tokens.ts)
- Preset dimensioni: [`skeleton-layout-presets.ts`](../components/design-system/loading/skeleton-layout-presets.ts)
- Primitive: [`skeleton-primitives.tsx`](../components/design-system/loading/skeleton-primitives.tsx)

## Regola: una sola rappresentazione per stato

| Fase | Ammesso | Vietato insieme |
|------|---------|------------------|
| Suspense route | `LoadingPageShellSkeleton` (header + 1 box) | Secondo skeleton full-page identico |
| Primo fetch (`data === undefined`) | `SkeletonTable` / `SkeletonCard` / composizioni route | `GlobalLoadingOverlay` |
| Background refetch | Testo toolbar «Aggiornamento…» | Skeleton full-page |
| Mutation `meta.globalLoading` | `LoadingOverlay` (spinner) | Skeleton stessa area |
| Upload | `LoadingProgressBar` (+ spinner sm) | Skeleton lista |
| Auth / gate | `LoadingView` o barra sottile | Skeleton pagina ERP |

## Primitive globali (nuovo standard)

| Componente | Uso |
|------------|-----|
| `SkeletonBlock` | Rettangolo generico |
| `SkeletonCard` | Widget / card KPI |
| `SkeletonTable` | Area tabella (box unico) |
| `SkeletonChart` | Grafici report |
| `SkeletonForm` | Pannelli form |
| `SkeletonModal` | Modali |
| `SkeletonDashboardWidget` | Preset dashboard |

**Non simulare:** righe tabella, header colonne, testo, icone, pill, bottoni finti.

## Legacy (deprecati)

- `LoadingTableSkeleton` — wrapper su `SkeletonTable`; non usare fuori da `loading/`
- `LoadingCardSkeleton` con `rows` — wrapper su `SkeletonCard`
- `LoadingToolbarSkeleton`, `LoadingLavorazioneMobileCardSkeleton` — rimossi dalla composizione

## Ridondanze risolte

| Area | Prima | Dopo |
|------|-------|------|
| Report | Suspense + dynamic + `live.isLoading` | Un gate in `report-analytics-view` |
| Liste ERP | Suspense dettagliato + view skeleton | Shell Suspense + view skeleton container |
| Bunder | Spinner full-page | `SkeletonTable` |
| Settings gate | Spinner banner + skeleton figli | Barra indeterminata testuale |

`GlobalLoadingQueryBridge` resta opt-in (`meta.globalLoading`); le query liste usano `suppressGlobalLoadingOnBackgroundRefetch` — nessun overlay su refetch con dati già in cache.

## Pagine — checklist

| Route | Skeleton target | Stato |
|-------|-----------------|-------|
| `/dashboard` | welcome + 2 widget + feed boxes | migrato |
| `/report` | toolbar + zone boxes | migrato |
| `/dipendenti` | header + KPI row + table box | migrato |
| `/mezzi` | table box | migrato |
| `/preventivi` | table + mobile cards | migrato |
| `/lavorazioni` | table + mobile stack | migrato |
| `/magazzino` | table box | migrato |
| `/documenti` | table box | migrato |
| `/impostazioni` | nav + content boxes | migrato |
| `/bunder` | table box | migrato |
| `/lavorazioni-clienti` | come lavorazioni | migrato |
| Login / reset | spinner (auth) | invariato |

## Verifica manuale

1. Cold load ogni route ERP: un solo `aria-busy` principale nel main.
2. Nessun salto evidente header/toolbar dopo hydrate.
3. `npm run smoke:regression` e `npm run ci:tsc`.
