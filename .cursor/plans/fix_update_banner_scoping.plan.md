---
name: Fix update banner scoping
overview: Correggere il banner "Nuovi dati disponibili" (`DataStaleBanner`) rendendo reattivo il filtro per scope/route, spostandolo dentro l'AppShell per eliminare la doppia scrollbar, centralizzando la visibilità in `getVisibleDirtyEntries()`, e aggiungendo test unitari + Playwright sul caso Dashboard → Magazzino.
todos:
  - id: scope-subscription
    content: subscribeGestionaleSyncScopes + protezione scope duplicati + integrazione in provider e cache dirty-state
    status: pending
  - id: visible-dirty-ssot
    content: Creare getVisibleDirtyEntries() + matchesRoute() come unica logica di filtro (provider, banner, test)
    status: pending
  - id: route-gating
    content: Popolare route nei 4 pilot scope, useLayoutEffect, pathname passato al provider (non filtrato nel banner)
    status: pending
  - id: move-banner-mount
    content: Spostare DeferredDataStaleBanner in app-shell-main come primo figlio di main scroll, verificare sticky
    status: pending
  - id: banner-layout-fix
    content: SystemBannerShell sticky in-shell senza height/margin/padding esterno né wrapper che alterano main
    status: pending
  - id: automated-tests
    content: Test unitari (incluso bug originale dashboard→magazzino) + mount policy + no body overflow
    status: pending
  - id: playwright-regression
    content: E2E Playwright — banner dashboard visibile, scompare dopo navigazione a /magazzino
    status: pending
  - id: manual-validation
    content: Verificare 4 casi navigazione + modale aperta + refresh (senza persistenza dirty)
    status: pending
isProject: false
---

# Fix banner "Aggiorna nuovi dati" — page scoping e layout

Vedi piano completo in Cursor plans: `fix_update_banner_scoping_80166699.plan.md`

## Vincoli espliciti (non negoziabili)

1. **Nessuna persistenza dirty** — no localStorage/sessionStorage. Post-F5: banner assente finché nuovo dirty signal.
2. **`getVisibleDirtyEntries()` SSOT** — provider, banner, test. Banner non filtra localmente.
3. **`matchesRoute()`** — `pathname === route || pathname.startsWith(\`${route}/\`)` (no falsi positivi `/report` vs `/reportistica`).
4. **Scope duplicati** — `registerGestionaleSyncScope` replace per `scopeId`.
5. **Sticky in-shell** — primo figlio di `main.gestionale-scroll-y`, no wrapper che alterano altezza/overflow.
6. **Playwright** — Dashboard → Magazzino regression.

## File chiave

- Nuovo: `lib/sync/gestionale-visible-dirty.ts`
- Core: `gestionale-sync-scope.ts`, `gestionale-dirty-context.tsx`, `data-stale-banner.tsx`
- Layout: `app-providers-gestionale.tsx` → rimuovi banner; `app-shell-main.tsx` → aggiungi banner
- E2E: `e2e/smoke/data-stale-banner-navigation.spec.ts`
