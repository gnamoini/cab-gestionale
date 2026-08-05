# Notification Provider Layer

Canali di delivery registrati in [`lib/notifications/delivery/providers/provider-registry.ts`](../lib/notifications/delivery/providers/provider-registry.ts).

## Contratto

```typescript
interface DeliveryProvider {
  readonly id: string;
  readonly channel: DeliveryChannel;
  deliver(ctx: NotificationContext): Promise<DeliveryResult>;
}
```

Il [`dispatcher.ts`](../lib/notifications/delivery/dispatcher.ts) risolve il provider per ID — **nessuna logica canale inline**.

## Provider attivi

| ID | Channel | File | Note |
|---|---|---|---|
| `realtime` | realtime | `realtime-provider.ts` | Ack server; consegna via postgres_changes client |
| `webpush` | push | `web-push-provider.server.ts` | VAPID, rate limit, batching |
| `desktop` | desktop | `desktop-provider.ts` | Foreground OS notification |
| `email` | email | `email-provider.server.ts` | Wrapper communication_engine |
| `noop` | — | `noop-provider.ts` | CI dry-run |
| `capture` | — | `capture-provider.ts` | QA payload log |

## Aggiungere un canale

1. Creare `lib/notifications/delivery/providers/{channel}-provider.server.ts`
2. Implementare `DeliveryProvider`
3. `registerDeliveryProvider()` in `provider-registry.ts`
4. Aggiornare `NOTIFICATION_POLICIES` se necessario
5. Test in `lib/notifications/delivery/providers/`

Canali futuri previsti: SMS, WhatsApp, Telegram, Teams, Slack.
