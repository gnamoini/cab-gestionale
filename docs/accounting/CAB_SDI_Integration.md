# CAB SDI Integration (FASE 9)

Provider: simulator (default) or Aruba WS when ARUBA_FE_* env set.

Aruba: upload + correlation lookup + notification polling. No webhook assumed.

Events: parseSdiEvent -> apply_sdi_event (idempotent).

Reconciliation: pending_reconciliation on timeout; cron reconcilePendingTransmissions.
