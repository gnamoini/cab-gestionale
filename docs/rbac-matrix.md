# RBAC matrix — Gestionale CAB

Matrice permessi moduli e capability. RLS Postgres è il controllo autoritativo.

**Audit completo:** [`audit-phase8-permissions-audit.md`](./audit-phase8-permissions-audit.md)

## Layer difensivi

1. Edge proxy (`proxy.ts`) — route coarse
2. `RbacPageGuard` — fail-closed 8s timeout
3. `GestionaleSectionGate` — modulo per pagina
4. Service `ensureSectionRead/Write/Delete` — client guard
5. Supabase RLS — authoritative

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
| security | `/dashboard/security` | `can_manage_security` |

## Capability globali

| Capability | Effetto |
|------------|---------|
| `can_read_operational` | Lettura moduli operativi |
| `can_write_operational` | Scrittura moduli operativi |
| `can_manage_settings` | Impostazioni globali |
| `can_manage_security` | Utenti e permessi |
| `editWorkOrders` | Lavorazioni, schede (non preventivi write — allineato EC-006) |

## Portale clienti

Accesso via `userHasClientLavorazioniAccess` + allowlist in `app_settings`.

## Verifica

```bash
npm run audit:rls
npx tsx lib/regression/security-rbac-policy.test.ts
npx tsx lib/regression/permissions-role-matrix.test.ts
```
