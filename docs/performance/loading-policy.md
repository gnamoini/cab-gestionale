# Loading policy — performance e UX

SSOT per orchestrazione stati di caricamento nel gestionale Next.js App Router.

## Regola fondamentale

> Il loading iniziale appartiene alla route. Il loading dati appartiene al componente. Il refetch non deve mai sostituire contenuto esistente con skeleton.

## Full-page loading ownership

**Un solo owner** per il placeholder full-page di una route:

| Owner | Quando usarlo |
|-------|----------------|
| `app/**/loading.tsx` | **Preferito** — navigazione cold, RSC, zero JS extra |
| `Suspense fallback` con skeleton | Solo se **non** esiste `loading.tsx` (vedi eccezioni in `lib/regression/loading-ownership-exceptions.ts`) |
| `dynamic()` `loading:` | **Vietato** se `loading.tsx` copre la route |
| RBAC guard full-page skeleton | **Vietato** — usare spinner minimale |
| `if (isLoading) return <BigSkeleton />` in view | **Vietato** come secondo owner full-page |

### Suspense e streaming

Non rimuovere `Suspense` usati per streaming RSC o prefetch deferred.

```tsx
// ❌ Duplicato — loading.tsx già mostra lo skeleton
<Suspense fallback={<LoadingSuspenseFallback variant="magazzino" />}>

// ✅ LEVEL 2 — structural skeleton body + PageLayout fuori Suspense
<PageLayout title="Magazzino ricambi">
  <Suspense fallback={<PageTransitionLoader variant="magazzino" />}>
    <MagazzinoDeferredHydration>...</MagazzinoDeferredHydration>
  </Suspense>
</PageLayout>
```

## LEVEL 2 — PageTransitionLoader (post Skeleton v3)

Tre livelli separati:

| Level | Meccanismo | Responsabilità |
|-------|------------|----------------|
| 1 | `loading.tsx` + structural skeleton | percezione iniziale cold nav |
| 2 | `PageTransitionLoader` structural skeleton in Suspense | gap chunk/hydration (body continuo con LEVEL 1) |
| 3 | bundle/hydration audit | velocità reale (ticket separato) |

Regole:
- `PageLayout` con titolo reale **fuori** Suspense
- `PageTransitionLoader` usa `StructuralRouteSkeleton` (variant route) — **non** spinner su sfondo vuoto
- `fallback={null}` vietato su route rollout (`loading-transition-fallback-allowlist.ts`)
- deny-by-default su altre route lazy+loading; eccezioni esplicite in allowlist

## Component (inline) loading ownership

Consentito in parallelo al full-page owner:

| Contesto | Regola |
|----------|--------|
| Widget dashboard | `isLoading && data === undefined` |
| Sezione tabella | skeleton locale nella sezione |
| Drawer / modale | `LoadingFormSkeleton` esclusivo (ternario, non `&&` + contenuto) |
| Sidebar nav | skeleton inline in `AppShell` |
| Background refetch | testo «Aggiornamento…», opacity, spinner — **mai** skeleton full-page |

```tsx
// ❌ Loading + contenuto insieme
{isLoading && <Skeleton />}
{items.map(...)}

// ✅ Stato esclusivo
{isInitialLoading ? <Skeleton /> : <Items />}
```

## Skeleton statici

I placeholder in `components/design-system/loading/` devono essere:

- server-renderable (no `"use client"` salvo spinner/overlay)
- senza import da `components/gestionale/*`, hooks o context
- senza `ShellCard` client — usare `SkeletonShellCard` con markup statico

## Refetch

- Usare `placeholderData` o `isLoading && data === undefined`
- Non mostrare skeleton se i dati precedenti sono già in cache

## Verifica

```bash
npx tsx lib/regression/loading-ownership-policy.test.ts
npx tsx lib/regression/page-layout-suspense-policy.test.ts
npx tsx lib/regression/loading-transition-fallback-policy.test.ts
npx tsx lib/regression/client-loading-boundary-policy.test.ts
npx tsx lib/regression/structural-skeleton-policy.test.ts
npx tsx lib/regression/skeleton-parity.test.ts
npm run audit:skeleton
npx tsx scripts/bench/skeleton-runtime-benchmark.ts
```

## Structural Skeleton System (v3)

SSOT engine: `components/design-system/loading/` (resolver + renderer) e API layout: `components/design-system/layout/`.

### Contratto pagina

```
PageLayout
 ├── PageHeader reale     ← mai skeletonizzato (fuori boundary)
 └── PageContent
      └── SkeletonBoundary   ← solo primo fetch client (minimal)
            └── PageSection / CombinedListSection + Skeleton Contract
```

- **Nessun Context RSC** — `mode="content" | "skeleton"` via prop
- **Nessun parsing DOM** — descriptor dichiarativi (`SkeletonContract`)
- **Geometry parity** — token semantici (`inventory-table`, `table`, …) in `skeleton-geometry-tokens.ts`; vietato `min-h-[*]` nei consumer
- **Route loading**: `loading.tsx` importa lo stesso `*PageStructure` / `*RouteStructure` della view con `mode="skeleton"`
- **SkeletonBoundary**: solo `if loading → skeleton else children` — no overlay, auth, LoadingManager

### Route migrate (structural)

| Route | Route structure | Note |
|-------|---------------|------|
| `/magazzino` | `MagazzinoRouteStructure` | pilota |

Le route non migrate restano su `LoadingSuspenseFallback` / skeleton manuali fino a migrazione.

