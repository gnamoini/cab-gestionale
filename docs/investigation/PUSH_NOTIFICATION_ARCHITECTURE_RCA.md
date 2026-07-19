# Push Notification Architecture — Root Cause Analysis

**Date:** 2026-07-19  
**Target:** SSOT v4 — domain publish + delivery worker pipeline  
**Plan:** Web Push Notifications SSOT v4 (finale)

---

## 1. Executive summary

The gestionale has a **partially unified** notification system (v2 DB inbox + async push queue). Gaps:

| Gap | Impact |
|-----|--------|
| Dual inbox (localStorage + DB) | Inconsistent badge/inbox during migration |
| Push enqueue in DB trigger | Business logic in DB, hard to test |
| Dual push workers (Vercel + Edge) | Race conditions, duplicated sends |
| No delivery orchestration | Push sent regardless of presence/prefs |
| Fragmented publishers | 6+ bridges + DB fanout + direct RPC |
| Desktop in publish path | Channel coupled to domain |

**Target:** `NotificationService.publish()` → persist → enqueue RAW → worker → Aggregator → Planner → Dispatcher → Providers.

**Explicitly excluded:** Database Webhook, Delivery Scheduler poll, aggregation in publish path.

---

## 2. Publisher inventory

| # | Origin | Module | Type(s) | Trigger | Current entrypoint | Migration order |
|---|--------|--------|---------|---------|-------------------|-----------------|
| 1 | `admin-lavorazioni-notification-bridge.tsx` | Lavorazioni | `lavorazione_created`, `lavorazione_completata` | cab-sync | `publishNotification` | 1 |
| 2 | `admin-magazzino-notification-bridge.tsx` | Magazzino | `magazzino_sotto_scorta` | cab-sync | `publishNotification` | 1 |
| 3 | `admin-scheduled-digest-notification-bridge.tsx` | Fatturazione | `fatture_scadute_digest` | scheduled 09:00 | `publishNotification` | 1 |
| 4 | `admin-dipendenti-presenze-reminder-bridge.tsx` | Dipendenti | `dipendenti_presenze_reminder` | scheduled 17:00 | `publishNotification` | 1 |
| 5 | `tagliando-due-notification.client.ts` / `.server.ts` | Mezzi | `tagliando_da_eseguire` | intervento create | client+server split | 2 |
| 6 | `notification-center-bell.tsx` | Sistema | `admin_dashboard_test` | UI test | `publishNotification` | 1 |
| 7 | DB trigger `trg_lavorazioni_client_portal_*` | Cliente | `client_portal_ingresso`, `client_portal_completata` | lavorazioni INSERT/UPDATE | `cab_fanout_*` | 3 |
| 8 | — | Workshop | `workshop_schedule_*` (9) | — | registry only | 5 |
| 9 | — | Preventivi | `preventivo_approvato` | — | mapper only | 5 |
| 10 | — | Lavorazioni | `lavorazioni_ritardo_digest` | — | registry only | 5 |

### Per-publisher flow (today)

```
Guasto/Lavorazione creato (remote cab-sync)
        ↓
admin-*-notification-bridge
        ↓
publishNotification (client)
        ↓
cab_create_notification RPC
        ↓
notifications INSERT
        ↓
trg_notifications_enqueue_push_delivery  ← REMOVE
        ↓
push_delivery_queue
        ↓
pg_net / Vercel worker / Edge Function
        ↓
Web Push + Realtime (sidebar refetch)
```

### Target flow

```
Domain Event
        ↓
EventToNotificationMapper
        ↓
NotificationService.publish(command)
        ↓
cab_publish_notification + cab_enqueue_raw_delivery
        ↓
notifications + delivery_queue (raw)
        ↓
Delivery Worker
        ↓
Aggregator → Planner → DeliveryPlan → Dispatcher → Providers
```

---

## 3. DB triggers to remove (rollout)

| Trigger / object | File | When to DROP |
|------------------|------|--------------|
| `trg_notifications_enqueue_push_delivery` | `20260915120900_push_subscriptions_delivery.sql` | After `notifications_ssot_v2=on` + shadow validation |
| `trg_push_delivery_queue_invoke_worker` | `20260915121000_push_delivery_pg_cron.sql` | Same |
| `push_delivery_queue` table | same | After `delivery_queue` backfill |
| `trg_lavorazioni_client_portal_ingresso` | `20260906130000_client_portal_notifications_db_triggers.sql` | After server-side fanout (step 3) |
| `trg_lavorazioni_client_portal_completata` | same | After server-side fanout |
| Edge `push-notification-send` | `supabase/functions/push-notification-send/` | After Vercel worker consolidation |

**No Delivery Scheduler.** Fanout DB triggers remain until publisher #7 is migrated server-side.

---

## 4. Badge, realtime, push paths (today)

| Channel | Writer | Reader |
|---------|--------|--------|
| Sidebar inbox | `notifications` via RPC list | `use-notification-center` |
| Badge | `cab_count_unread_notifications` | `notification-center-bell`, `pwa-notification-badge` |
| Realtime | Supabase INSERT on `notifications` | `RealtimeInboxCoordinator` |
| Web Push | `push-delivery-process.server.ts` | SW `push-sw-handlers.ts` |
| Desktop OS | `publish-notification.ts` direct | Browser Notification API |
| localStorage legacy | `admin-notification-store` | `use-admin-notification-store` (flag `off`) |

---

## 5. Duplications and risks

1. **Dual push workers** — Vercel + Supabase Edge Function
2. **Dual inbox** — localStorage when `notifications_v2_mode != on`
3. **Desktop in publish** — bypasses delivery pipeline
4. **Cab-sync toasts** — ephemeral UX layer (by design, not inbox SSOT)
5. **Registry vs app catalog** — workshop/preventivo types in DB only

### Edge cases

- `dedup_key` conflict → silent skip (`ON CONFLICT DO NOTHING`)
- Realtime INSERT visible before RLS filter on refetch
- Push 404/410 → subscription revoke (existing)
- `create-only` mode dual-writes legacy + DB
- Client portal fanout without RAW enqueue until migrated

---

## 6. Migration rollout (explicit, no scheduler)

| Step | Action | Flag |
|------|--------|------|
| 1 | Deploy domain + delivery worker with `DELIVERY_PROVIDER=capture` | `notifications_ssot_v2=shadow` |
| 2 | Migrate bridges 1–6 to `NotificationService` | shadow → on |
| 3 | Disable push DB trigger; use `delivery_queue` | `notifications_ssot_v2=on` |
| 4 | Server fanout cliente; DROP portal triggers | — |
| 5 | `DELIVERY_PROVIDER=webpush` staging → prod | — |
| 6 | Sunset localStorage | `notifications_v2_mode=on` enforced |
| 7 | DROP `push_delivery_queue`, Edge function | — |

---

## 7. References

- [`lib/notifications/notification-event-catalog.ts`](../../lib/notifications/notification-event-catalog.ts)
- [`docs/notifications-system-report.md`](../notifications-system-report.md)
- [`docs/adr/ADR-002-notification-ssot-architecture.md`](../adr/ADR-002-notification-ssot-architecture.md)
- Migration: `supabase/migrations/20261019120000_notification_ssot_v4.sql`
