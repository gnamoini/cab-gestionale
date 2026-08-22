# P6 Release Validation

**Date:** 2026-08-21  
**Environment:** LOCAL production build (`npm run build` + `npm run start` on `:3210`) — no staging; no deploy  
**Scope:** Report `/report` P6 Advanced BI — audit only, no P6 code changes

---

## Build / Typecheck

| Gate | Result | Evidence |
|------|--------|----------|
| `npm run ci:tsc` | **PASS** | 0 blockers (`scripts/ci-tsc-gate.ts`) |
| `npm run build` | **PASS** | Next.js 16.2.6 — compiled in ~74s, 133 static pages, `/report` route present |

Production build completes cleanly with P6 tree included.

---

## Regression

| Suite | Result |
|-------|--------|
| `eco-incassato-registry-parity.test.ts` | **PASS** |
| `resolve-multi-metric-display-mode.test.ts` | **PASS** |
| `report-p6-ui-no-formulas.test.ts` | **PASS** |
| `report-p5-ui-no-formulas.test.ts` | **PASS** |
| `lib/control/suites/report-p6-advanced-bi.suite.ts` | **PASS** (4 files) |

Registry parity for `eco_incassato`: manifest ↔ registry ↔ calculator alignment verified.

---

## E2E

| Spec | Result | Notes |
|------|--------|-------|
| `report-advanced-bi.spec.ts` (2) | **BLOCKED_EXTERNAL_ENV** | |
| `report-bi-center.spec.ts` (2) | **BLOCKED_EXTERNAL_ENV** | |
| `report-drilldown.spec.ts` (5) | **BLOCKED_EXTERNAL_ENV** | |
| `report-business-report.spec.ts` (1) | **BLOCKED_EXTERNAL_ENV** | |
| `report-operational-context.spec.ts` (2) | **BLOCKED_EXTERNAL_ENV** | |

**Cause:** `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` not set in `.env.local` (template: `.env.smoke.example`). All 12 tests fail at `adminCredentials()` — not product regressions.

**Production server check:** `GET /report` → redirect ` /login?from=%2Freport` (auth gate OK).

---

## Visual Acceptance

| Check | Method | Result |
|-------|--------|--------|
| IA order (Executive → Insight → Trend → Context → Advanced → Historical → Timeline → Business Report) | Code + mount structure | **PASS** (static) |
| Section anchors `#bi-*` | Code review | **PASS** |
| Desktop Advanced visible | `hidden md:block` in shell | **PASS** (static) |
| Mobile Advanced lazy expand | `report-advanced-expand` testid | **PASS** (static) |
| Authenticated viewport review (1440 / mobile) | Browser | **NOT RUN** — login required |

Interactive visual sign-off pending human session with admin creds on local production build.

---

## Bundle

| Item | Finding |
|------|---------|
| Report SSR entry | `app/(gestionale)/report/page.js` ≈ **2.3 KB** |
| Client strategy | `ReportViewLazy` + `dynamic()` for Primary Trend, Context, Advanced, Historical, Timeline, Business Report |
| Above-fold static | Executive, Insight, SectionNav (~expected) |
| Largest shared chunks | ~449 KB JS (app-wide, not Report-specific) |
| CSS | ~384 KB shared stylesheet |
| Heavy libs on Report path | No new static imports of pdfjs/supabase in P6 `bi-center/` tree |

P6 Advanced BI uses code-splitting; no new heavy static imports detected in mount path.

---

## Network

**Authenticated cold-load model** (static trace — not measured this session):

| # | Endpoint | Trigger | Initial? |
|---|----------|---------|----------|
| 1 | `/api/report/executive` | `useReportExecutive` | Yes |
| 2 | `/api/report/insights` | Insight boundary | Yes |
| 3 | `/api/report/analytics` | `ReportAnalyticsProvider` merged batch | Yes |
| 4 | `/api/report/operational-context?view=summary` | Context panel | Yes |
| 5 | `/api/report/business-report` | Business report shell | Yes |
| 6 | `/api/report/analytics` (12w local period) | Historical section | Yes (2nd query key) |
| — | `/api/report/operational-context?view=timeline` | Timeline V2 | Lazy (expand) |
| — | `/api/report/drilldown` | Drill-down panel | On demand |

**P6 delta vs P5 (architectural):**

- Still **one** merged analytics batch for BI sections (not N per domain).
- P6 adds cross-domain metric IDs + domain `includeSeries` → **larger payload on request #3**, not extra parallel analytics calls.
- Historical second analytics call existed pre-P6 (local 12w/12m range).

**Known overlap (pre-existing, not P6-introduced):**

- Executive cards via `/api/report/executive` **and** same metric IDs in analytics `executiveEnrichment` — duplicate server work, single UI pattern since P2.

**Measured KB / request counts:** Not captured — no P5 Network artifact on disk; completion report §6 still TBD.

---

## Performance P5 vs P6

| Metric | P5 artifact | P6 (this audit) | Verdict |
|--------|-------------|-----------------|---------|
| Initial API request count | TBD (P5 report §6) | Model: ~6 (+ lazy) | **Inconclusive** |
| Analytics requests | 2 (merged + historical) | 2 (same pattern) | **No regression** (architecture) |
| Analytics payload KB | Not captured | Expected ↑ (more metrics/series) | **Monitor in review** |
| FUR | N/A | N/A | **Inconclusive** |
| `ci:tsc` / `build` | P5 deferred | **PASS** | **Improved** |

No evidence of avoidable request waterfall introduced by P6 Advanced components.

---

## Responsive

| Feature | Implementation | Static review |
|---------|----------------|---------------|
| Desktop section nav | `ReportSectionNav` — `sticky top-0`, `hidden md:block` | OK |
| Mobile nav | `ReportSectionNavMobile` — select scroll-into-view | OK |
| Mobile Advanced | Collapsed button → expand grid | OK |
| Cross-domain | `xl:col-span-2`, grid stacks on narrow | OK |
| min-w-0 on mount | Prevents horizontal overflow | OK |

Live responsive verification blocked by auth (same as Visual).

---

## Formula/UI separation

| Check | Result |
|-------|--------|
| `report-p6-ui-no-formulas.test.ts` | **PASS** — no Supabase/formula symbols in P6 UI surfaces |
| Cross-domain prose | Deltas only; regression gate on interpretive patterns | **PASS** |
| `resolveMultiMetricDisplayMode` | No client-side indexed normalization | **PASS** |
| Duplicate KPI grids vs Executive | `withoutExecutiveOverlap()` on domain sections | **PASS** |
| Double Executive shell | `embedded` on `ReportV2ExecutiveBoundary` | **PASS** |
| Trust footer | Primary Trend uses `ReportTrustCompareFooter` + compare label | **PASS** |
| `eco_incassato` registry parity | Unit test | **PASS** |
| Business Report reachable | `#bi-business-report` anchor + nav link | **PASS** (static) |
| Timeline reachable | `#bi-timeline` anchor + nav link | **PASS** (static) |

---

## Production risks

1. **Analytics payload growth** — P6 registers more metrics/series in merged batch; monitor response size on real data.
2. **Executive + analytics dual fetch** — legacy pattern; extra DB/engine work per page load (not new in P6).
3. **Historical always-on 2nd analytics call** — intentional local range; consider lazy if payload becomes an issue (out of P6 scope).
4. **E2E / visual gap locally** — configure `SMOKE_ADMIN_*` per `.env.smoke.example` before merge sign-off.
5. **Legacy `<details>`** — still ships duplicate charts when expanded (deferred shrink).

---

## Blockers

**Code / build blockers:** none

**Review blockers (environment / human):**

1. Authenticated E2E smoke not executed locally (missing smoke creds).
2. Network payload numbers not measured; P5 baseline absent — capture on production build with admin session before promote.

---

## Verdict

### **READY FOR PRODUCTION REVIEW**

Build and regression gates pass. P6 architecture preserves single merged analytics batch, code-splits Advanced surfaces, and passes formula/UI separation checks. Remaining items are authenticated E2E, visual walkthrough, and Network tab evidence — review prerequisites, not code defects.

**Do not start P7 until human completes authenticated local review on production build.**
