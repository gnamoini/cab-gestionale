# Communication Platform Layer

Outbound communications (email first) fan-out from the same domain events as staff notifications.

## Relationship to Notification SSOT v4

| Pattern | Notifications (staff) | Communications (customer/supplier) |
|---------|----------------------|-------------------------------------|
| Outbox | `notification_outbox` | `communication_outbox` |
| Processor | `notification-outbox-processor` | `communication-outbox-processor` |
| Send queue | `delivery_queue` | `communication_send_queue` |
| Worker | `push-delivery` / delivery worker | `communication-send-worker` |
| History | `notifications` | `communication_log` |

**No second event bus.** DB triggers enqueue both outboxes with the same domain event type + payload.

## Pipeline

```
domain event (outbox)
  → communication policy resolver
  → template engine (rendered_payload)
  → recipient resolver
  → guards (ALLOW_EXTERNAL_EMAILS, dry-run, test mode)
  → communication_send_queue
  → Resend (+ webhook updates status)
```

## Initial deploy mode

- `testMode=true` (UI)
- `clientEmailEnabled=false` (UI)
- `ALLOW_EXTERNAL_EMAILS=false` (env)

## Future channels

`ChannelProvider` abstraction: email (implemented), WhatsApp, SMS, Portale Cliente (stubs).
