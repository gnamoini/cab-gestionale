# Sprint 2.6 — Provider audit

**Baseline bundle:** 1866.6 KB → **1833.3 KB** after FormUx defer (step 1)  
**Schema:** ranking v3.1 — `bundleImpactScore = gzipKb × effectiveReach × firstLoadFactor`

## Provider tree (critical path)

```
app/layout.tsx
 └── AppProvidersCore
      ├── ToastProvider, QueryProvider, GlobalLoadingProvider
      ├── AuthProvider, ThemeProvider
      └── children

app/(gestionale)/layout.tsx
 └── AppProvidersGestionale
      ├── DeferredUploadFeedbackShell (async)
      ├── AppSettingsQueryProvider — FREEZE
      ├── RealtimeStatusProvider — FREEZE
      ├── ObservabilityProviderLite — sync
      ├── ObservabilityDiagnosticsPack — lazy/gated
      ├── BrandingProvider — KEEP
      ├── DeferredSupabaseConfigurationBanner — defer (async)
      ├── PermissionsSnapshotMount — FREEZE
      ├── GestionaleDirtyProvider + DeferredGestionaleBridges
      └── DeferredDataStaleBanner — defer (async)
 └── DeferredFormUxBoundaryBootstrap — defer (async, step 1 win)
 └── AppShell → RBAC gates — FREEZE
```

## `criticalProviderCount` (frozen)

**Definition:** Client Component providers mounted before `data-testid="page-ready-toolbar"`.

**Baseline:** `5` — `AppProvidersGestionale`, `AppSettingsQueryProvider`, `RealtimeStatusProvider`, `ObservabilityProviderLite`, `BrandingProvider`

Snapshot: `test-results/critical-provider-baseline-sprint26.json`

## Defer candidates (post-analyzer)

| Target | Impact | Safety | Score | Kill switch | Stato |
|--------|-------:|-------:|------:|-------------|-------|
| Form UX bootstrap | ~71 | 0.9 | 64 | `NEXT_PUBLIC_FORM_UX_BOOTSTRAP_DEFER` | **implemented — −33 KB** |
| Upload Tray | ~369 | 0.5 | 185 | `NEXT_PUBLIC_UPLOAD_TRAY_DEFER` | implemented (no first-load delta) |
| Supabase Banner | 15 | 1.0 | 15 | `NEXT_PUBLIC_SUPABASE_BANNER_DEFER` | implemented (no first-load delta) |
| Data stale banner | 10 | 0.85 | 8.5 | `NEXT_PUBLIC_DATA_STALE_BANNER_DEFER` | implemented (no first-load delta) |
| App Settings | ~322 | 0 | 0 | — | **freeze** (217 KB chunk) |
| RBAC / PermissionsSnapshot | ~322 | 0 | 0 | — | **freeze** (129 KB chunk) |

## First-load dominant chunks (analyzer)

| Role | rawKb | Action |
|------|------:|--------|
| supabase-client | 232 | keep |
| react-framework | 226 | keep |
| app-settings-domain | 217 | freeze |
| permissions-rbac | 129 | freeze |

## Gate per ogni defer (AND)

- `firstLoadJsKb` delta misurato
- `removedFromFirstLoad: true` AND `newSharedChunk: false`
- `skeletonToInteractiveMs` dashboard ≤ baseline +10%
- `criticalProviderCount` ≤ baseline
- provider mount profile: no +20% on critici

## Rollback

- **Build flag** `NEXT_PUBLIC_*_DEFER=0` → rebuild + redeploy
- **Runtime** `window.__GESTIONALE_FEATURE_FLAGS__ = { formUxBootstrapDefer: false }` → emergency mount off
