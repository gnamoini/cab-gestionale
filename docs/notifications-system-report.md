# Sistema notifiche gestionale CAB — Audit v2

**Data audit:** 2026-08-04  
**SSOT codice:** [`lib/notifications/notification-event-catalog.ts`](../lib/notifications/notification-event-catalog.ts)  
**ADR:** [`docs/adr/ADR-002-notification-ssot-architecture.md`](adr/ADR-002-notification-ssot-architecture.md)  
**RCA push:** [`docs/investigation/PUSH_NOTIFICATION_ARCHITECTURE_RCA.md`](investigation/PUSH_NOTIFICATION_ARCHITECTURE_RCA.md)

---

## Principi architetturali

1. **Inbox ≠ Realtime** — `notifications` è la persistenza (fonte di verità). Realtime, Push, Email, Desktop sono canali di delivery.
2. **Ingresso unico** — `dispatchNotificationEvent()` per fan-out staff; mai generazione inbox da client.
3. **Provider Layer** — canali registrati in `provider-registry.ts`; il dispatcher non contiene logica canale.
4. **Template SSOT** — titolo/body/deep link da `notification_templates` (DB + loader).
5. **Legacy removal last** — codice legacy resta finché i test della nuova pipeline sono verdi.

---

## Pipeline

```
Evento dominio
    ↓
notification_outbox (DB trigger / cron)
    ↓
dispatchNotificationEvent()
    ↓
cab_dispatch_notifications_bulk → notifications (INBOX)
    ↓
delivery_queue → runDeliveryWorker → Planner → Dispatcher
    ├── RealtimeProvider (ack server; client postgres_changes)
    ├── PushProvider (web-push / VAPID)
    ├── EmailProvider (communication_engine)
    └── DesktopProvider
    ↓
UI legge inbox (React Query) — badge da cab_count_unread_notifications
```

### Componenti

| Componente | Ruolo | File SSOT |
|---|---|---|
| Outbox | Accodamento eventi DB | `supabase/migrations/20261103120000_notification_outbox.sql` |
| Inbox | Persistenza notifiche | tabella `notifications` |
| Dispatch | Fan-out destinatari | `lib/notifications/dispatch/notification-dispatch-service.server.ts` |
| Delivery queue | Job per canale | `delivery_queue` + `delivery-worker.server.ts` |
| Provider Layer | Canali indipendenti | `lib/notifications/delivery/providers/` |
| Realtime subscriber | Invalidazione cache client | `lib/notifications/realtime-inbox-coordinator.ts` |
| Push SW | Background delivery | `lib/pwa/push-sw-handlers.ts` |
| Templates | Copy + deep link | `notification_templates` + `lib/notifications/templates/` |
| Preferenze | Per-evento + canale | `notification_event_preferences` |
| Trace | Osservabilità E2E | `notification_pipeline_trace`, `notification_delivery` |

**Nota:** non esiste `notification_log`. Logging: `notification_dispatch_log`, `notification_delivery`, `notification_pipeline_trace`.

---

## Mapping ruoli (recipient tier)

| Profilo | `role_key` | Tier | Note |
|---|---|---|---|
| Admin | `admin` | `admin` | |
| Direttore | `manager` | `admin` | Stesso tier di admin nel resolver |
| Commerciale / Personale amm. | `addetto_amministrativo` | `ufficio` | |
| Magazziniere / Meccanico | `operatore` | `officina` | legacy: magazziniere, tecnico |
| Cliente | `cliente` | `cliente` | Solo portale |
| Ospite | `guest` | — | Escluso |

**Policy lavorazioni:** tier `ufficio` escluso (catalogo attuale).

**RLS:** `notification_visible_to_auth_user()` — staff vede `global`, proprie `user`, `role` se match; fix 2026-09-10 per scope user staff.

---

## Catena Direttore (audit end-to-end)

Verificare per `role_key=manager`:

| Anello | Stato | File |
|---|---|---|
| Ruolo → tier admin | OK | `role-recipient-tier.ts` |
| Recipient resolver | OK | `resolve-notification-recipients.ts` |
| Staff inbox eligible | OK | `staff-inbox-eligible.ts` (non filtra manager) |
| RLS | OK post-fix | `20260910160000_notification_visibility_user_scope_fix.sql` |
| UI `isAdmin` | **Fix applicato** | `use-permissions.ts` — include manager |
| Push delivery | OK su v4 | `delivery-planner.ts` usa `role_key` |
| Legacy push path | Bug `profiles.role` | `push-delivery-process.server.ts` — da rimuovere Sprint 8 |

---

## Catalogo eventi

SSOT: `NOTIFICATION_EVENT_CATALOG` in `notification-event-catalog.ts`.  
Validazione build: `lib/regression/notification-catalog-completeness.test.ts` (registry + policy + template + deep link + test).

Eventi esclusi by design: `schede.lavorazione_updated`, `dipendenti.timesheet_updated` (volume), toast cab-sync, `impostazioni.updated`.

---

## Legacy — inventario (rimozione Sprint 8)

| Asset | Stato | Prerequisito rimozione |
|---|---|---|
| `push_delivery_queue` | Morto con SSOT v2=on | E2E push verdi |
| Edge `push-notification-send` | Duplicato | Zero traffico legacy |
| `push-delivery-process.server.ts` | Bug role | Worker v4 completo |
| `NEXT_PUBLIC_NOTIFICATIONS_SSOT_V2` | Default `on` | Tutti test policy |
| `notifications_v2_mode` + localStorage inbox | Dual inbox | `readsDb` sempre true |
| `publishNotification` client | Bypass server | Test campanella via API |

**Non rimuovere** finché `npm run control:pr` e E2E notification non passano.

---

## Osservabilità

- Health: `GET /api/admin/notifications/health`
- Metriche: dispatch latency, push/realtime latency, failure rate, retry count, success % per provider
- Pipeline trace: `dispatch` → `persist` → `client_received` → `client_ack`

---

## Riferimenti

- [`docs/notifications-provider-layer.md`](notifications-provider-layer.md)
- [`scripts/diagnose-notification-pipeline.ts`](../scripts/diagnose-notification-pipeline.ts)
