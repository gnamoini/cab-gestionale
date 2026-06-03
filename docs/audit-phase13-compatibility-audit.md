# FASE 13 — Audit compatibilità browser/device (Gestionale CAB)

Inventario viewport, iOS Safari, touch/scroll, matrice browser e copertura E2E mobile. Stato verificato **2026-06-02** post-fix fasi 1–12.

**Documenti correlati:** [`bootstrap-hydration.md`](./bootstrap-hydration.md) · [`audit-phase4-edge-cases.md`](./audit-phase4-edge-cases.md) · [`release-gate.md`](./release-gate.md)

**Legenda:** ✅ gestito · ⚠️ parziale · ❌ gap · 📋 backlog · 🔧 fix audit applicato

---

## Sintesi esecutiva

| Area | Stato pre-audit | Post fase 13 |
|------|-----------------|--------------|
| Viewport / safe-area / dvh | ✅ token centralizzati | ✅ |
| iOS keyboard + focus scroll | ✅ `IosInteractionStability` | ✅ |
| Input zoom iOS (≥16px) | ⚠️ eccezioni sparse | 🔧 timesheet compact |
| Scroll containment kanban | ❌ blocker UX gate | 🔧 kanban skeleton |
| Playwright mobile E2E | ⚠️ 2 spec viewport manuale | 🔧 + `12-mobile-routes` |
| CI browser matrix | ⚠️ solo Chromium | 📋 Firefox/WebKit backlog |
| iOS static check | ✅ `npm run ios:check` | ✅ (warnings accettati) |
| UX mobile gate CI | ❌ blocker kanban skeleton | 🔧 fix applicato |

---

## Stack compatibilità

| Layer | Implementazione | File chiave |
|-------|-----------------|-------------|
| Viewport meta | `device-width`, `viewportFit: cover` | `app/layout.tsx` |
| CSS vars viewport | `--cab-vv-height`, safe-area | `app/globals.css` |
| Input 16px mobile | `dsIosInputTextSize` | `lib/ui/ios-mobile-tokens.ts` |
| Modali mobile | dvh + safe-area + scroll attr | `lib/ui/design-system.ts`, `mobile-modal-behavior.ts` |
| Focus / keyboard | visualViewport sync | `src/components/ios-interaction-stability.tsx` |
| Body scroll lock | manager centralizzato | `lib/ui/body-scroll-lock-manager.ts` |
| Kanban touch | touch-action + overscroll | `lavorazioni-scroll.css` |

---

## Matrice browser / device

| Target | Priorità | Copertura auto | Focus manuale |
|--------|----------|----------------|---------------|
| Chrome desktop | P0 | ✅ Playwright (12 spec) | Full regression |
| Edge desktop | P1 | 📋 stesso engine Chromium | Auth, modali |
| Firefox | P1 | ❌ non in CI | Realtime, date inputs |
| Safari desktop | P1 | ❌ non in CI | Cookie session, flex |
| iOS Safari | P0 | ⚠️ euristica statica + E2E viewport | Modal scroll, keyboard, touch kanban |
| Android Chrome | P1 | 🔧 E2E viewport 390×844 | Shell, filter drawer |
| Tablet (md+) | P2 | 📋 | Sidebar + modale wide |

**CI release-gate:** installa solo `chromium`; `ux:mobile-gate` + `smoke:playwright` obbligatori.

---

## Gate statici mobile

| Script | Comando | CI | Esito post-fix |
|--------|---------|-----|----------------|
| UX mobile regression | `npm run ux:mobile-gate` | ✅ release-gate | PASS |
| iOS heuristics | `npm run ios:check` | Manuale | PASS (0 blocker, warnings) |
| Flex / layout | smoke regression | ✅ | PASS |

---

## Playwright smoke — compatibilità

| Spec | Viewport | Scenario |
|------|----------|----------|
| `04-modal-scroll.spec.ts` | 390×844 + 1280×720 | Drawer nav, scrollbar main, log drawer lock |
| `06-mobile-shell.spec.ts` | 390×844 | Dashboard overflow orizzontale |
| `12-mobile-routes.spec.ts` | 390×844 | 🔧 dashboard, lavorazioni, magazzino, dipendenti |
| `07-hydration-runtime.spec.ts` | desktop | Hydration mismatch |
| `01-auth` … `11-client-portal` | desktop default | Funzionale RBAC/moduli |

---

## Fix applicati (fase 13)

| ID | File | Descrizione |
|----|------|-------------|
| P13-F01 | `loading-kanban-skeleton.tsx` | overscroll + touch-action su colonne kanban skeleton |
| P13-F02 | `timesheet-cell-editor.tsx` | input compact: 16px mobile (`md:text-xs`) |
| P13-F03 | `e2e/smoke/12-mobile-routes.spec.ts` | overflow check 4 route core mobile |
| P13-F04 | `lib/regression/compatibility-policy.test.ts` | policy CI compatibilità |

---

## Gap aperti (backlog)

| ID | Severità | Descrizione |
|----|----------|-------------|
| P13-001 | P2 | Firefox / WebKit in CI |
| P13-002 | P3 | Playwright project `Pixel 5` nativo |
| P13-003 | P2 | BUNDER / schede input font mobile |
| P13-004 | P3 | Filter drawer mobile E2E |
| P13-005 | P3 | Tablet sidebar + hub modale |

---

## Verifica automatica

```bash
npm run ci:tsc
npm run ux:mobile-gate
npm run ios:check
npx tsx lib/regression/compatibility-policy.test.ts
npm run smoke:regression
npm run smoke:playwright
```
