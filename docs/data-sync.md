# Data sync — Gestionale CAB

Riferimento operativo per invalidazione cache, Realtime e mutazioni cross-tab.

**Audit completo:** [`audit-phase9-data-sync-audit.md`](./audit-phase9-data-sync-audit.md)

## Pipeline mutazione

1. Service layer muta Supabase
2. `dispatchGestionaleAction` / `dispatchDipendentiTimesheetSync` emette evento cab-sync
3. `invalidate-targets.ts` mappa entità → query keys React Query
4. Realtime (se connesso) o polling 20s invalida altri tab

## Entità cab-sync principali

| Entità | Invalidate | Realtime |
|--------|------------|----------|
| lavorazioni | liste + KPI | ✅ |
| magazzino_ricambi | liste + report | ✅ |
| preventivi | liste | ✅ |
| bunder_documents | bunder list | ✅ |
| dipendenti_timesheet_* | griglia dipendenti | ✅ (migration 20260705120000) |
| user_permissions / profiles | RBAC truth layer | ✅ (migration 20260705120000) |
| dashboard_promemoria | dashboard feed | ✅ |

## Policy React Query

| Policy | staleTime | Uso |
|--------|-----------|-----|
| Core | 30s | Liste operative |
| View | 60s | Dashboard, read-only |
| Report | 120s | KPI aggregati |

Fonte: `lib/react-query/query-layer-policies.ts`

## Verifica

```bash
npx tsx lib/regression/sync-invalidation-policy.test.ts
npm run smoke:regression
```

## Backlog

- EC-002: optimistic lock timesheet multi-tab (last-write-wins)
