# Performance Provider Cost Map (Sprint 0.1)

**Audit only** — misurare prima di Sprint 1 fix pagina.

## Metodo

1. `NEXT_PUBLIC_BOOT_TIMING=1 npm run dev`
2. React Profiler: mount `(gestionale)/layout` → `page-ready-toolbar`
3. `npm run analyze` per peso chunk provider

## Provider tree (`AppProvidersGestionale`)

```
UploadFeedbackProvider
  AppSettingsQueryProvider
    RealtimeStatusProvider
      ObservabilityProvider
        BootInvestigationMount
        RuntimeHealthBridge
        BrandingProvider
          SettingsModalOpenProvider
            PermissionsSnapshotMount
              GestionaleDirtyProvider
                DeferredGestionaleBridges  ← RealtimePack, PwaBridgePack
```

## Stima costo hydration (da validare in Profiler)

| Provider / bridge | Stima | Sprint 2 azione |
| ----------------- | ----: | ----------------- |
| QueryClientProvider | ~0 ms | — |
| AuthGate + session | ~40 ms | cache auth |
| PermissionsSnapshot | ~120 ms | defer se possibile |
| SettingsReadyGate | ~200 ms | già non-blocking |
| RealtimeBridge | ~350 ms | **defer idle** (implementato rAF→idle) |
| Observability | TBD | lazy |
| GestionaleDirtyProvider | TBD | audit render globali |

## Decision gate

Se provider cost **>40%** interactive baseline → valutare Sprint 1.5 realtime defer aggiuntivo.

## Implementato Sprint 2 (parziale)

- [`deferred-gestionale-bridges.tsx`](../src/components/deferred-gestionale-bridges.tsx): `requestIdleCallback` + timeout 2s
