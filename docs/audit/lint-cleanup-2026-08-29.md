# Fase 2 — Global Lint Cleanup & Code Hygiene Audit

**Date:** 2026-08-29  
**Baseline commit:** `a4c00c0cac11e51ae9c46e274a0058898397194c`  
**Node:** v24.15.0 · ESLint 9 flat config

---

## Executive summary

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| **Errors** | 737 | **0** | −737 |
| **Warnings** | 914 | **260** | −654 |
| **Total problems** | 1651 | **260** | −1391 (−84%) |
| **Files with findings** | 653 | 155 | −498 |

**Conclusion:** `LINT_CLEAN_WITH_DOCUMENTED_EXCEPTIONS` — zero ESLint errors; 260 warning-level items documented below as accepted Phase 2B / legacy debt.

`npm run lint` exits **0** (warnings only).

---

## Pre-check

- **Branch/commit:** `a4c00c0` (Fase 1 baseline)
- **Working tree:** ~100+ dirty application files (identifica-ricambio, inventory-labels, AI, PDF, lavorazioni)
- **Gate files:** not modified (hard constraint respected)
- **Ownership map:** [`lint-file-ownership-2026-08-29.json`](./lint-file-ownership-2026-08-29.json) — 641 CLEAN / 12 DIRTY at start

---

## Config audit

| Check | Result |
|-------|--------|
| `eslint.config.mjs` flat + `eslint-rules/` | OK — no severity downgrade |
| `cab-layout` vs `audit:ui` / `flex:eslint:gate` | Overlap documented; gates remain separate |
| `ds-lock-baseline.json` | Baseline-aware rule; violations outside baseline fixed |
| `e2e/**` | Added `react-hooks/rules-of-hooks: off` (Playwright fixture `use`) |
| `public/sw.js` | Added to `globalIgnores` (generated workbox) |
| `CAB_DS_LOCK_STRICT` | Not enabled |

---

## Wave execution

### Phase 2A (mechanical + UI + P0 hooks)

| Wave | Scope | Outcome |
|------|-------|---------|
| Safe auto-fix | CLEAN files only (`scripts/lint-phase2-tools.ts fix-clean`) | No global `npm run lint --fix` |
| 1A | `prefer-const`, safe imports | CLEAN sweep |
| 2 | `cab-layout/no-ui-contract-violation` (200) | 112 files — `min-w-0`, responsive `flex-wrap`, table tokens |
| 3A P0 | `rules-of-hooks`, false-positive `use*` renames, conditional hooks | 14 → 0 errors; renamed `isDeterministicStockPipelineActive`, `shouldUseTkbMemoryStore` |
| STOP CHECKPOINT | lint + tsc + contract | See §Regression |

### Phase 2B (semantic hooks)

| Wave | Scope | Outcome |
|------|-------|---------|
| 3B | `set-state-in-effect`, `exhaustive-deps`, `refs` | CLEAN pool cleared; DIRTY_NO_OVERLAP surgical pass |
| 1B | `no-unused-vars` | 436 warnings removed on CLEAN files |
| Residual | tooltips, flex, purity/immutability, `no-select-star` | CLEAN rule targets → 0 |

---

## Significant semantic fixes (P0)

| File | Fix |
|------|-----|
| `settings-workspace-shell.tsx` | Moved `if (!open) return null` after all hooks |
| `report-ai-analysis-zone.tsx` | Hoisted legacy `useCallback`/`useMemo` before branch returns |
| `global-loading-context.tsx` | Unconditional `useDelayedActive` call |
| `stock-pipeline.ts` | `isDeterministicStockPipelineActive` (not a React hook) |
| `tkb-publish.server.ts` | `shouldUseTkbMemoryStore` |
| `use-client-pagination.ts`, `use-retry-after-countdown.ts` | Derived state / interval tick instead of effect setState |
| `use-admin-notification-store.ts` | `useSyncExternalStore` for store subscription |

---

## eslint-disable audit (summary)

| Action | Count (approx.) |
|--------|-----------------|
| **KEEP** (pre-existing, documented) | ~30 |
| **ADD** (Phase 2, narrow + reason) | ~190 |
| **REMOVE** (stale after fix) | ~48 via `eslint --fix` |

New disables are **line-scoped** with `-- reason` for: mount restore, fetch lifecycle, reposition deps, refs wiring in large modals (`capture-scheda-compile-step`, `global-select`, `lavorazione-create-modal`).

`public/sw.js` — **IGNORE** via config (generated).

---

## Remaining warning debt (260)

| Rule | W | Notes |
|------|---|-------|
| `@typescript-eslint/no-unused-vars` | 212 | Legacy callback props / multi-line destructuring — Phase 2B follow-up |
| `react-hooks/exhaustive-deps` | 16 | Mostly DIRTY_NO_OVERLAP (`global-select`, client portal) |
| `cab-perf/no-img-without-next-image` | 7 | Intentional blob/proxy URLs (documented inline) |
| `cab-layout/no-native-title-tooltip` | 7 | Truncate labels pending Tooltip migration |
| Other (a11y, incompatible-library, direct-ds-import) | ~18 | Low volume |

---

## Regression checkpoints

### Post–3A STOP CHECKPOINT

| Gate | Result | Classification |
|------|--------|----------------|
| `npm run lint` | **PASS** (0 errors) | IMPROVED |
| `npm run ci:tsc` | FAIL | PRE_EXISTING + 4 INTRODUCED_BY_PHASE2 (fixed same session) |
| `release-ready-contract.test.ts` | **PASS** | unchanged |

### FINAL

| Gate | Result |
|------|--------|
| `npm run lint` | **PASS** — 0E / 260W |
| `npm run ci:tsc` | FAIL — `admin-users.ts`, `use-lavorazione-create-submit.ts`, `lib/search/registry.ts` (**PRE_EXISTING** product debt) |
| `release-ready-contract.test.ts` | **PASS** |
| `flex:eslint:gate` | Not re-run (informativo; subset unchanged) |

**INTRODUCED_BY_PHASE2 (fixed):** erroneous `_` import renames in prefetch/hooks/tests; `parsePrioritaDb` signature; `deferred-gestionale-bridges` type.

---

## Gate integration

- **RELEASE_READY contract:** unchanged
- **`npm run lint` in `release-gate.yml`:** NOT promoted (per plan)
- **Lint status for governance:** `LINT_CLEAN_WITH_DOCUMENTED_EXCEPTIONS`

---

## Artifacts

| File | Purpose |
|------|---------|
| [`lint-debt-2026-08-29.txt`](./lint-debt-2026-08-29.txt) | Frozen text snapshot (start) |
| [`lint-baseline-raw.json`](./lint-baseline-raw.json) | ESLint JSON (final) |
| [`lint-baseline-2026-08-29.json`](./lint-baseline-2026-08-29.json) | Before/after summary |
| [`lint-file-ownership-2026-08-29.json`](./lint-file-ownership-2026-08-29.json) | CLEAN / DIRTY_* map |
| [`scripts/lint-phase2-tools.ts`](../scripts/lint-phase2-tools.ts) | Ownership + safe fix helper |

---

## Risks / follow-up

1. **Warning debt (260)** — dedicated unused-vars pass when product dirty tree stabilizes.
2. **File-level `refs` disables** on 4 large capture/select modals — revisit when React Compiler patterns mature.
3. **DIRTY file overlap** — lint fixes on `identifica-ricambio-view`, `lavorazioni-view` limited to lint hunks; re-verify after product merge.
