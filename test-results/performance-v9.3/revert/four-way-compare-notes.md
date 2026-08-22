# Four-way compare notes (V9.3 revert)

## V93_BASELINE

```text
V9.2 expected state + independent map-auth-user / fetch-rbac-role-key fix (KEEP)
```

## Per-file comparison

| File | HEAD 2a08a838 | V9.2 delta | V9.3 delta | Current after revert |
|------|---------------|------------|------------|----------------------|
| auth-context.tsx | full static gestionale imports | same as HEAD | strip + session-actions | = HEAD |
| layout.tsx | bridges in root providers | bridges in gestionale layout | +hydrate | V9.2 (bridges, no hydrate) |
| map-auth-user.ts | lib/auth/rbac | — | — | lib/rbac (KEEP) |
| fetch-rbac-role-key.ts | lib/auth/rbac | — | — | lib/rbac (KEEP) |

## layout.tsx rule

Never full restore from HEAD — HEAD had bridges in app-providers-core, V9.2 moved them to gestionale layout. Revert removed only V9.3 hydrate import/JSX.
