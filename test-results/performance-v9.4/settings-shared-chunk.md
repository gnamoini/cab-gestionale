# Settings shared chunk — V9.4 root cause proof

## Target chunk (post-revert build)

| Metric | Value |
|--------|-------|
| File | `0jzqpdoeyl4gf.js` (hash varies per build; class = V9.1 `0s341h9qjiqsa.js`) |
| rawKb | **365.9** |
| gzipKb | **104.3** |
| routeImpact | **All routes** including `/login`, `/`, `/dashboard` |
| reachScope | `application` (effectiveReach = 1) |

**Not pure "settings"** — mixed fingerprint:

```text
GESTIONALE_PAGES, resolvePageAccess, app_settings, resolveEffectivePermissions, AppSettings
```

## Decomposition

| Category | In chunk? | Notes |
|----------|-----------|-------|
| Actual settings resolve | **partial** | `AppSettings`, `app_settings` strings |
| Permissions / RBAC | **yes** | `GESTIONALE_PAGES`, `resolvePageAccess`, `resolveEffectivePermissions` |
| Framework / react-dom | **separate chunk** | `0d.m5yg8x90g9.js` 226 KB |
| Supabase client | **separate chunk** | `0_-ofxhecoztq.js` 232 KB |
| Next router runtime | **separate** | `0te757ahqt7en.js` 107 KB |
| Route metrics artifact | **partial** | Chunk listed on `/login` because **application-wide shared**, not only login-static |

## Proof chain — `/login` root import path (static)

```text
/login
  → app/login/page.tsx (LoginFormLazy only)
  → app/layout.tsx
  → AppProviders → AppProvidersCore
  → AuthProvider (context/auth-context.tsx)  [STATIC on every route]
      → resolveEffectivePermissions
          → resolve-page-access
              → gestionale-pages + gestionale-page-icons
      → invalidateRuntimeTruth (login success path)
          → clearRuntimeCabAppSettings + gestionale realtime invalidate
      → invalidateRbacTruthClient (logout)
      → magazzino registries (transitionToAnonymous)
```

**map-auth-user** (KEEP fix): now `@/lib/rbac` — does **not** pull `lib/auth/rbac` heavy graph.

## Proof chain — settings resolve (gestionale-only static)

```text
/dashboard (and other gestionale routes)
  → app/(gestionale)/layout.tsx
  → AppProvidersGestionale
      → AppSettingsQueryProvider
          → useCabAppSettingsPayloadQuery
              → fetchCabAppSettingsPayload
                  → resolveCabAppSettingsFromRows (domain parsers: lavorazioni/magazzino/mezzi/…)
```

This chain is **NOT mounted on `/login`**, but `0jzqpdoeyl4gf.js` still appears in `/login` `firstLoadChunkPaths` because bundler places RBAC+settings modules in the same **application shared chunk** consumed by auth-context on login.

## Why V9.3 revert restored ~1816.5 KB

Stripping auth-context imports (V9.3) did not shrink shared chunk — **+0.2 KB**. Co-chunked RBAC+settings cannot be split by auth-only boundary without bundler graph change or removing multiple roots.

## Largest confirmed removable cost (trace-proven)

| Target | Est. first-load removable | Evidence |
|--------|---------------------------|----------|
| auth-context → resolveEffectivePermissions | **&lt;10 KB** measured (V9.3) | Chunk shuffle, shared aggregate |
| resolve-from-rows domain split | **&lt;1 KB** measured (V9.1 +0.4) | REVERTED |
| map-auth-user → lib/rbac | **already applied** | Independent KEEP |

**No intervention meets ≥50 KB trace-proven first-load elimination** in this audit.

## Next target (future sprint)

Structural webpack/Turbopack split of `0jzqp…` aggregate OR defer entire RBAC resolve off auth-context **with** bundler config / separate entry — not dynamic-in-effect.
