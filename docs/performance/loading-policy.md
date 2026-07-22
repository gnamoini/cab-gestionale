# Loading policy — performance e UX

SSOT per orchestrazione stati di caricamento nel gestionale Next.js App Router.

## Regola fondamentale

> Il loading iniziale appartiene alla route. Il loading dati appartiene al componente. Il refetch non deve mai sostituire contenuto esistente con skeleton.

## Gerarchia loading (L1 → L3)

```
LEVEL 1 — loading.tsx
  owner unico full-page skeleton

        ↓

LEVEL 2 — HydrationBoundary
  prefetch server-side in page async, zero skeleton

        ↓

LEVEL 3 — skeleton locali
  card, widget, tabella, sezione (layout stabile)

        ↓

Contenuto
```

| Livello | Meccanismo | Skeleton? |
|---------|------------|-----------|
| L1 | `app/**/loading.tsx` | Sì — unico full-page |
| L2 | `GestionaleHydrationBoundary` + `prefetchGestionalePage` | No |
| L3 | `LoadingCardSkeleton`, `SkeletonBoundary`, slot widget | Sì — solo sezione |

## Full-page loading ownership

**Un solo owner** per il placeholder full-page di una route:

| Owner | Quando usarlo |
|-------|----------------|
| `app/**/loading.tsx` | **Preferito** — navigazione cold, RSC, zero JS extra |
| `Suspense fallback` con skeleton | Solo se **non** esiste `loading.tsx` (vedi `lib/regression/loading-ownership-exceptions.ts`) |
| `dynamic()` `loading:` full-section | **Vietato** se `loading.tsx` copre la route |
| RBAC guard full-page skeleton | **Vietato** — usare spinner minimale |
| `if (isLoading) return <BigSkeleton />` in view | **Vietato** come secondo owner full-page |

### Page async + prefetch

```tsx
// ✅ L1 loading.tsx + page async — un solo skeleton route
export default async function MagazzinoPage() {
  const qc = createServerQueryClient();
  await prefetchGestionalePage(qc, "magazzino");
  return (
    <PageLayout title="Magazzino ricambi">
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <MagazzinoViewLazy />
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}

// ❌ Duplicato — loading.tsx + PageTransitionLoader
<Suspense fallback={<PageTransitionLoader variant="magazzino" />}>
```

Prefetch configurabile in `src/lib/react-query/prefetch-gestionale-page.ts`:

- `prefetchCriticalPage` — sempre nel page async
- `prefetchDeferredPage` — solo se `PAGE_PREFETCH_CONFIG[page].prefetchDeferredOnServer === true` o override `includeDeferred`
- Query below-the-fold (es. analytics report) → `prefetchDeferredOnServer: false`, skeleton L3 in view

## Component (inline) loading ownership

Consentito in parallelo al full-page owner:

| Contesto | Regola |
|----------|--------|
| Widget dashboard | skeleton nello slot widget, layout griglia stabile |
| Sezione tabella | skeleton locale nella sezione |
| Drawer / modale | `LoadingFormSkeleton` esclusivo (ternario, non `&&` + contenuto) |
| Sidebar nav | skeleton inline in `AppShell` |
| Background refetch | testo «Aggiornamento…», opacity, spinner — **mai** skeleton full-page |

```tsx
// ❌ Loading + contenuto insieme
{isLoading && <Skeleton />}
{items.map(...)}

// ✅ Stato esclusivo nello slot
{isLoading ? <LoadingCardSkeleton /> : <Widget />}
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
- **Route loading**: `loading.tsx` importa lo stesso `*PageStructure` della view con `mode="skeleton"`
- **SkeletonBoundary**: solo `if loading → skeleton else children` — no overlay, auth, LoadingManager

### Route migrate (structural)

Tutte le route in `MIGRATED_LOADING_OWNER_ROUTES` (`lib/regression/loading-transition-fallback-allowlist.ts`).

Le route non migrate restano su `LoadingSuspenseFallback` / skeleton manuali fino a migrazione.
