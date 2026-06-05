# Osservabilità interna (leggera)

Sistema di logging strutturato **solo console** — nessun servizio esterno (Sentry, Datadog, ecc.).

**Governance ops production:** [observability-ops.md](./observability-ops.md) — severity, debug flow, health snapshot.

## Moduli

| Percorso | Ruolo |
|----------|--------|
| [`lib/observability/logger.ts`](../lib/observability/logger.ts) | `gestionaleLogger.debug/info/warn/error` |
| [`lib/observability/events.ts`](../lib/observability/events.ts) | `trackRuntimeEvent`, catalogo `RuntimeEvents` |
| [`lib/observability/perf.ts`](../lib/observability/perf.ts) | `measureAsync` — query lente (opt-in) |
| [`lib/observability/context.ts`](../lib/observability/context.ts) | Contesto `userId`, `route`, `operation` |
| [`lib/observability/fatal-aggregator.ts`](../lib/observability/fatal-aggregator.ts) | Buffer in-memory fatal (dedupe + throttle) |
| [`components/observability/observability-provider.tsx`](../components/observability/observability-provider.tsx) | Aggiorna contesto da auth + pathname |
| [`components/observability/gestionale-client-error-boundary.tsx`](../components/observability/gestionale-client-error-boundary.tsx) | Error boundary React client |

## Formato log

Ogni riga è JSON su `console`:

```json
{"ts":"…","level":"info","msg":"auth.login.success","userId":"…","route":"/dashboard","operation":"auth","event":"auth.login.success"}
```

## Variabili ambiente

| Variabile | Default | Effetto |
|-----------|---------|---------|
| `NEXT_PUBLIC_OBS_LOG_LEVEL` | `info` (prod), `debug` (dev) | Filtra livelli |
| `NEXT_PUBLIC_OBS_PERF` | `0` | `1` → warn su query >500ms (`measureAsync`) |
| `NEXT_PUBLIC_CAB_OPS_WARN` | — | Abilita warn anche in produzione (legacy `dev-warn`) |

## Eventi runtime

| Evento | Livello |
|--------|---------|
| `auth.login.success` / `auth.login.failed` | info / warn |
| `auth.logout` | info |
| `auth.session.invalid` | warn |
| `rbac.resolve.*` | debug / info / warn |
| `documenti.upload.*` / `documenti.delete.*` | info / warn |
| `lavorazione_documents.delete` | info |
| `report.data.ready` / `report.data.error` | info / error |
| `cache.invalidate.truth` / `.spike` / `.coalesced` | debug / warn |
| `cache.invalidate.operational` | debug |
| `auth.restore.duration` | info |
| `dashboard.load.duration` | info |
| `report.data.ready` (con `durationMs`) | info |
| `realtime.reconnect` | debug |
| `realtime.polling.fallback` | warn |
| `storage.delete.failure` | warn |
| `runtime.hydration.mismatch` | error |
| `realtime.flush` / `realtime.burst` | debug / warn |
| `perf.slow` | warn (con `OBS_PERF=1`) |

## Fatal aggregator

`recordFatal(kind, { message, route })` — boundary crash, hydration, invalidation spike. Max 50 entry, throttle 10s per chiave. `flushSummaryForLog()` per riepilogo.

## Warn dedupe

`gestionaleLogger.warn` deduplica messaggi identici entro 5s (anti-spam console).

## Runtime health e degradation

| Modulo | Ruolo |
|--------|--------|
| [`lib/observability/runtime-health.ts`](../lib/observability/runtime-health.ts) | Contatori e metriche rolling (`getRuntimeHealthSnapshot`) |
| [`lib/observability/degradation-detector.ts`](../lib/observability/degradation-detector.ts) | Soglie storm/reconnect/polling |
| [`components/observability/runtime-health-bridge.tsx`](../components/observability/runtime-health-bridge.tsx) | Log snapshot periodico (dev / `CAB_OPS_WARN`) |

Production-safe: `NEXT_PUBLIC_OBS_LOG_LEVEL=info`, `NEXT_PUBLIC_OBS_PERF=0`, evitare `CAB_OPS_WARN=1` in prod salvo indagine.

## Ops

- [`docs/ops-production-checklist.md`](./ops-production-checklist.md)
- `npm run ops:diagnostics` — env + storage advisory

## Lettura in dev

1. Login → cercare `auth.login.success` con `userId` e `route`.
2. Aprire Report → `report.data.ready` una volta per mount.
3. Con `NEXT_PUBLIC_OBS_PERF=1`, query lente → `perf.slow`.

## Sicurezza log

Non vengono loggati password, token o payload file. Meta troncati a 500 caratteri per stringa.

## Error boundaries

- Next.js: [`app/error.tsx`](../app/error.tsx), [`app/(gestionale)/error.tsx`](../app/(gestionale)/error.tsx)
- Client: `GestionaleClientErrorBoundary` in [`components/app-providers.tsx`](../components/app-providers.tsx)

UI condivisa tramite `GestionaleErrorFallback` (eyebrow, icona warning, azioni Riprova/Indietro/home, dettagli tecnici collassabili con digest, collegamenti rapidi RBAC in variante gestionale). Humanize messaggi in `lib/observability/error-message-humanize.ts`.
