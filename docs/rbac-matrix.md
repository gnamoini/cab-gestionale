# RBAC matrix — Gestionale CAB

Modello **pagina-based SSOT**: `GESTIONALE_PAGES` + `PageAccessLevel` (`write` | `read` | `none`) + resolver unico `resolve-page-access.ts`.

Tabelle runtime:

- `role_page_access` — matrice ruolo × pagina (3 livelli)
- `user_page_overrides` — override per utente (assenza riga = eredita ruolo)

Tabelle legacy (`role_permissions`, `user_permissions`) — solo RLS/migrazione, **nessuna scrittura** dall'app.

## Precedenza effettiva (solo nel resolver)

1. **Admin bypass** → tutte le pagine `write`
2. **Override utente** (`user_page_overrides`)
3. **Permessi ruolo** (`role_page_access`)
4. **Default** `none`

Funzioni canoniche:

- TS: `src/lib/rbac/resolve-page-access.ts` → `ResolvedPageAccess`
- Snapshot: `resolve-effective-permissions.ts` → `EffectivePermissionsSnapshot`
- SQL: `rbac_user_page_access_level`, `user_effective_can` (bridge moduli RLS)

## Layer difensivi

1. Edge proxy — `pathnameToPageAccess(...).visible`
2. `RbacPageGuard` — stesso check
3. Nav — `buildGestionaleNav(resolved)` filtra `showInNav && visible`
4. Server actions — `ensurePageRead` / `ensurePageWrite`
5. Supabase RLS — moduli espansi da pagina (`expandPageToModuleKeys`)

## Gestione in UI

- **Sicurezza → Ruoli**: matrice ruolo × pagina (`SecurityPageMatrixEditor`)
- **Sicurezza → Utenti**: override per pagina (`SecurityUserPagePermissionsEditor`), "Eredita" = DELETE riga override

## Pagine (`GESTIONALE_PAGES`)

Catalogo dinamico in `src/lib/permissions/gestionale-pages.ts` — aggiungere una entry = nuova pagina RBAC + nav.

Espansione moduli RLS (es. `preventivi` → `ddt`, `ordini_fornitori`; `documenti` → `document_capture`).

## Portale clienti

Accesso = `canReadPage(resolved, "lavorazioni_clienti")` — nessuna allowlist `app_settings`.

## Verifica

```bash
npx tsc --noEmit
npx tsx lib/regression/page-access-resolver.test.ts
npx tsx lib/regression/rbac-legacy-audit.test.ts
npx tsx lib/regression/permissions-role-matrix.test.ts
npx tsx lib/regression/sidebar-nav-rbac.test.ts
npx tsx lib/regression/rbac-cross-layer-matrix.test.ts
```
