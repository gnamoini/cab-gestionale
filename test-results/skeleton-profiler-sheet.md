# Skeleton Profiler Sheet — LEVEL 2 transition loader (2026-07-19)

## Hard refresh (benchmark esteso, dev 1440)

| Route | Skeleton | clientChunk | Transition | Interactive | skeletonToInteractive | blankAfter | layoutShift |
|-------|----------:|------------:|-----------:|------------:|----------------------:|-----------:|------------:|
| /dashboard | 616ms | 349ms | — | 1337ms | 721ms | 346ms | — |
| /magazzino | 898ms | 395ms | 490ms | 2004ms | 1106ms | 406ms | 0px |
| /lavorazioni | 4399ms* | 446ms | 184ms | 5853ms | 1454ms | 443ms | 0px |

\*skeleton window include attesa RSC in dev.

## Soft navigation

| Route | interactive | blankAfterLoading |
|-------|------------:|------------------:|
| /magazzino | 169ms | 0ms |
| /lavorazioni | 153ms | 0ms |

## Throttle (osservazione)

| Route | transition | interactive | skeletonToInteractive |
|-------|----------:|------------:|----------------------:|
| /dashboard | 1863ms | 7923ms | 6731ms |
| /lavorazioni | 9353ms | 15153ms | 14588ms |

## Verdetto

- LEVEL 2 loader: **attivo** su rollout routes
- `blankAfterLoadingMs`: **< 500ms** (gate PR)
- Layout shift loader→view: **0px**
- `interactiveMs` alto → LEVEL 3 bundle audit
