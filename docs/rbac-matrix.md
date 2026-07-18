# RBAC matrice ruolo×pagina (SSOT)

## Authorization (solo app entrypoint)

- **SSOT:** `role_page_access` → `resolve-page-access` → `none | read | write`
- **Unica primitive runtime:** `ensurePageWrite(page)` / `verifyServerPageWrite(page)` su boundary entrypoint
- **Entrypoint allowlist:** `lib/domain/*-entry.ts`, `app/api/**/route.ts`, server actions, layout SSR
- **`src/services/**`:** authorization-free (business rules + RLS only)

## Invarianti

| ID | Regola |
|----|--------|
| I1 | `cap_*` = data-plane only; ∉ permission snapshot |
| I2 | 1× `ensurePageWrite` per request graph; no entrypoint chaining |
| I3 | `WORKFLOW_TO_PAGE` = metadata; `WORKFLOW_REGISTRY` = routing only |
| I4 | Snapshot solo da matrice pagina |

## Moduli ERP

- `magazzino_carichi` — ricezione DDT / carichi magazzino (`/magazzino/carichi`)


```text
UI/hooks → lib/domain/*-entry.ts [ensurePageWrite] → src/services/** (no guard)
```

CI: `rbac-entrypoint-call-site-audit.test.ts` (AST), `rbac-legacy-audit.test.ts`.
