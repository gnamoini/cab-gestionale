# PWA production runbook — Web Push

Operatività minima per abilitare, monitorare e disattivare il push PWA.

## Feature flag

| Ambiente | Variabile | Valore consigliato |
|----------|-----------|-------------------|
| Preview / staging | `PWA_PUSH_ENABLED` | `true` oppure omettere se VAPID configurati (auto-on) |
| Production | `PWA_PUSH_ENABLED` | `true` oppure omettere se VAPID configurati |

Il flag è letto da:

- **Next.js (client + cron):** `PWA_PUSH_ENABLED` (esposto via `next.config.ts` `env`)
- **Edge Function `push-notification-send`:** secret `PWA_PUSH_ENABLED` su Supabase

Disattivazione emergenza: impostare `PWA_PUSH_ENABLED=false` su Vercel **e** su Supabase Edge secrets, poi redeploy o attendere propagazione (Edge: immediata al prossimo invoke).

## Variabili richieste

### Vercel (app Next.js)

| Nome | Tipo | Note |
|------|------|------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | pubblica | Chiave VAPID pubblica per `pushManager.subscribe` |
| `VAPID_PRIVATE_KEY` | server | Chiave privata per invio cron (mai `NEXT_PUBLIC_`) |
| `VAPID_SUBJECT` | server | Es. `mailto:service@autocompattatori.it` |
| `PWA_PUSH_ENABLED` | server + client build | `true` solo dove si abilita il push |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Già presente; usata dal cron worker |
| `CRON_SECRET` | server | Opzionale; Vercel Cron invia `Authorization: Bearer <CRON_SECRET>` |

### Supabase Edge Function secrets

| Nome | Note |
|------|------|
| `VAPID_PRIVATE_KEY` | Mai nel client |
| `VAPID_PUBLIC_KEY` o `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Per `web-push.setVapidDetails` |
| `VAPID_SUBJECT` | Es. `mailto:service@autocompattatori.it` |
| `PWA_PUSH_ENABLED` | `true` quando la pipeline è attiva |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono forniti automaticamente all’Edge Runtime.

## Rotazione chiavi VAPID

1. Generare nuova coppia: `npx web-push generate-vapid-keys`
2. Aggiornare `NEXT_PUBLIC_VAPID_PUBLIC_KEY` su Vercel (tutti gli ambienti target)
3. Aggiornare `VAPID_PRIVATE_KEY` (+ public se usata) su Supabase secrets
4. Redeploy app Vercel (per inline della public key nel bundle)
5. Gli utenti con subscription vecchia dovranno ri-abilitare il push (opt-in UI); subscription invalide vengono revocate automaticamente su `410 Gone`

## Pipeline delivery (SSOT v4)

```
NotificationService.publish()
  → cab_publish_notification + cab_enqueue_raw_delivery
  → delivery_queue (job_phase=raw)
  → GET/POST `/api/cron/push-delivery` → runDeliveryWorker()
  → Aggregator → DeliveryPlanner → Dispatcher → Providers
```

| Flag | Valori |
|------|--------|
| `NEXT_PUBLIC_NOTIFICATIONS_SSOT_V2` | `off` \| `shadow` \| `on` |
| `DELIVERY_PROVIDER` | `webpush` \| `noop` \| `capture` |

Health: `GET /api/admin/notifications/health`. Rollback: `DELIVERY_PROVIDER=noop`.

## Pipeline delivery (legacy, pre-migration)

```
notifications INSERT
  → trigger trg_notifications_enqueue_push_delivery
  → push_delivery_queue (pending)
  → Vercel route POST/GET `/api/cron/push-delivery`
  → push-delivery-process.server (claim batch + web-push su Vercel)
  → cab_complete_push_delivery (sent / retry / dead_letter)
```

**Scheduling:** su piano Vercel Hobby non è disponibile cron frequente. Il consumer primario è il trigger DB `push_delivery_queue_invoke_worker` (pg_net → worker Vercel su ogni enqueue). Backup opzionale: `pg_cron` job `push-delivery-poll` ogni 2 min se l’estensione è abilitata sul progetto Supabase.

## Verifica automatica queue e delivery

SQL (service role / SQL editor):

```sql
-- Coda per stato
select status, count(*) from push_delivery_queue group by status;

-- Ultimi errori
select id, notification_id, status, attempts, last_error, next_attempt_at
from push_delivery_queue
where status in ('failed', 'dead_letter')
order by created_at desc
limit 20;

-- Subscription attive per company
select company_id, count(*) from push_subscriptions where revoked_at is null group by company_id;
```

Invocazione manuale worker (autorizzata):

```bash
curl -X POST "$APP_URL/api/cron/push-delivery" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Risposta attesa con push disabilitato: `{"ok":true,"skipped":"push_disabled"}`.

## Revoca subscription invalide

Automatica: Edge Function su HTTP `404` / `410` da push endpoint → `push_subscriptions.revoked_at = now()`.

Manuale (utente): RPC `cab_revoke_push_subscription(endpoint)` via client autenticato.

Admin (SQL, emergenza):

```sql
update push_subscriptions
set revoked_at = now()
where endpoint = '<endpoint>';
```

## Deploy componenti

| Componente | Comando / azione |
|------------|------------------|
| Migration push | `supabase db push` o MCP `apply_migration` (`push_subscriptions_delivery`) |
| Edge Function | `supabase functions deploy push-notification-send` |
| App + cron | Deploy Vercel (`vercel.json` cron su `/api/cron/push-delivery`) |

## Test automatici locali / CI

```bash
npm run test:pwa
npm run build
```

## Rollback

1. `PWA_PUSH_ENABLED=false` su Vercel + Supabase
2. Opzionale: fermare cron rimuovendo entry da `vercel.json` e redeploy
3. La coda smette di essere consumata; righe `pending` restano fino a riattivazione (nessuna perdita silenziosa)
