# Architettura connettore UnoERP

```text
Browser
  → domain entry (preventivi-entry / ddt-entry)
  → POST /api/integrations/unoerp/enqueue
  → snapshot immutabile in unoerp_sync_jobs
  → cron / worker
  → lib/integrations/unoerp (server-only)
  → UnoERP API (info/index/show/create/update)
```

Mai: Browser → UnoERP.

Cron è solo trigger. Fonte di verità: `unoerp_sync_jobs`.

Circuit breaker: `UNOERP_SYNC_HARD_STOP` (incident response). CAB continua; outbox raccoglie; write UnoERP stop.

SYNCED solo dopo WRITE → SHOW → verify campi CAB_MASTER.
