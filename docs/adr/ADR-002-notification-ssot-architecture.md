# ADR-002: Notification SSOT Architecture (v4)

**Status:** Accepted  
**Date:** 2026-07-19

## Context

The gestionale had parallel notification paths: localStorage inbox, DB inbox, desktop API in publish path, and push enqueue in DB triggers. Push delivery was duplicated across Vercel and Supabase Edge Function.

## Decision

### Domain layer

- Single entrypoint: `NotificationService.publish(PublishNotificationCommand)`
- Flow: `validate → persist → enqueue RAW → emit InternalNotificationCreated`
- Domain **never** aggregates, resolves channels, or calls providers

### Delivery layer (worker)

```
claim RAW → Aggregator → DeliveryPlanner → DeliveryPlan → Dispatcher → Providers
```

- **Aggregator** runs in worker (windowed, cross-node via `notification_aggregation_buffer`)
- **DeliveryPlan** is fully resolved before dispatch
- **PresenceResolver** → `UserDeliveryContext` only
- **ChannelPolicyResolver** interprets declarative `NOTIFICATION_POLICIES`

### Data model

- `NotificationRecord` (persisted) vs `ResolvedNotification` (immutable provider payload)
- `delivery_queue` with `job_phase`: `raw` | `executive`
- `notification_delivery` per-channel/device tracking
- `idempotency_key` separate from `dedup_key`

### Explicitly rejected

- Database Webhook for dispatch
- Delivery Scheduler polling `CREATED` rows
- Aggregation in `publish()`
- Push policy logic in DB triggers

### Mechanical DB bridge (temporary)

`trg_notifications_enqueue_raw_delivery` calls `cab_enqueue_raw_delivery` on INSERT — no policy, only for DB fanout until server migration.

## Providers

| Provider | Use |
|----------|-----|
| `webpush` | Production VAPID |
| `noop` | CI / dry-run |
| `capture` | QA payload log |

`DELIVERY_PROVIDER` env selects mode.

## Consequences

- Easier testing (capture/noop)
- Single worker path via `/api/cron/push-delivery`
- Incremental migration via `notifications_ssot_v2` flag
- Fanout DB triggers removed after server-side client portal publisher

## References

- [PUSH_NOTIFICATION_ARCHITECTURE_RCA.md](../investigation/PUSH_NOTIFICATION_ARCHITECTURE_RCA.md)
- Migration: `supabase/migrations/20261019120000_notification_ssot_v4.sql`
