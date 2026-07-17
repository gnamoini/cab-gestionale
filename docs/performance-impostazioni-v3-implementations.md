# Impostazioni Performance v3 — Implementations

**Date:** 2026-07-17

## Wave A — SSR streamabile

- `app/(gestionale)/impostazioni/page.tsx`: critical/deferred split (pattern mezzi-invertito)
- `components/gestionale/impostazioni/impostazioni-deferred-hydration.tsx`: seeds deferred cache
- `src/lib/react-query/prefetch-gestionale-page.ts`: settings spostati da critical a deferred per `impostazioni`

## Wave B — Query ownership

- `src/hooks/gestionale/use-impostazioni-settings-query.ts`: thin wrapper tier static
- `components/dashboard/settings/settings-workspace-shell.tsx`: consumer refactor
- `src/hooks/gestionale/use-settings-queries.ts`: ponytail comment su hydration dedup

## Wave C — Bundle gates

- `components/dashboard/settings/settings-section-loaders.ts`: lazy heavy sections + modali
- Shell: `SettingsLavorazioniModalLazy`, hierarchy/branding/economici/tkb/maintenance lazy
- Modali: elimina/rinomina/log drawer lazy; `use-settings-similar-gate` → dynamic simile dialog

## Wave D — In-uso gating

- `lib/app-settings/prefetch-impostazioni-in-uso-queries.ts`
- Shell: `needsStatiInUso` / `needsAddettiInUso` + prefetch in `pickSection`

## Wave E — Budget

- `lib/performance/performance-budget-registry.ts`: entry `/impostazioni`

## Invariato

- RBAC `verifyServerPageWrite` in layout + `getAppSettingsPayloadServer`
- Save/OCC/bulk mutations
- `prefetchImpostazioniPage()` per compat/test
