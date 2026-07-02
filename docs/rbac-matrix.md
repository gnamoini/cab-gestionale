# RBAC matrix — Gestionale CAB

Matrice permessi moduli e capability. **Postgres è la SSOT runtime** (`roles`, `permissions`, `role_permissions`, `user_roles`, `user_permissions`).

`lib/rbac.ts` / `lib/rbac-seed.ts` contengono solo seed statico per migrazioni e test — **nessun fallback runtime** alla matrice TS.

**Audit completo:** [`audit-phase8-permissions-audit.md`](./audit-phase8-permissions-audit.md)

## Precedenza effettiva

1. **Admin bypass** (SQL + TS resolver)
2. **Override utente `deny`**
3. **Override utente `allow`**
4. **Permessi ruolo** (`role_permissions`, solo allow)
5. **Default deny**

Funzioni canoniche:

- SQL: `rbac_user_effective_permission`, `user_effective_can`, `rbac_has_capability`
- TS: `src/lib/rbac/resolve-user-permissions.ts` → snapshot per request

## Layer difensivi

1. Edge proxy (`proxy.ts`) — route coarse
2. `RbacPageGuard` — fail-closed 8s timeout
3. `GestionaleSectionGate` — modulo per pagina
4. Service `ensureSectionRead/Write/Delete` — client guard
5. Supabase RLS — authoritative

## Gestione in UI

- **Sicurezza → Ruoli e matrice**: CRUD ruoli custom + matrice `role_permissions`
- **Sicurezza → Utenti**: assegnazione `role_key`, override allow/deny per modulo

## Moduli (`GestionalePermissionModule`)

| Modulo | Route | Service guard |
|--------|-------|---------------|
| lavorazioni | `/lavorazioni` | `ensureSectionWrite("lavorazioni")` |
| preventivi | `/preventivi` | `ensureSectionWrite("preventivi")` |
| magazzino | `/magazzino` | `ensureSectionWrite("magazzino")` |
| mezzi | `/mezzi` | `ensureSectionWrite("mezzi")` |
| documenti | `/documenti` | `ensureSectionWrite("documenti")` |
| dipendenti | `/dipendenti` | `ensureSectionWrite("dipendenti")` |
| fatturazione | `/fatturazione` | `ensureSectionWrite("fatturazione")` |
| ddt | *(backend only — UI embedded in `/preventivi`)* | RLS/RPC; grant mirror da `preventivi` |
| bunder | `/bunder` | modulo bunder |
| report | `/report` | read report |
| impostazioni | `/impostazioni` | `can_manage_settings` |
| security | `/sicurezza` | `can_manage_security` |

## Capability globali

| Capability | Effetto |
|------------|---------|
| `can_read_operational` | Lettura moduli operativi |
| `can_write_operational` | Scrittura moduli operativi |
| `can_manage_settings` | Impostazioni globali |
| `can_manage_security` | Utenti e permessi |
| `can_access_client_area` | Portale clienti |

## Portale clienti

Accesso via `userHasClientLavorazioniAccess` + allowlist in `app_settings`.

## Verifica

```bash
npm run audit:rls
npx tsx lib/regression/rbac-data-driven-resolver.test.ts
npx tsx lib/regression/security-rbac-policy.test.ts
npx tsx lib/regression/permissions-role-matrix.test.ts
npx tsx lib/regression/rbac-route-matrix.test.ts
```
