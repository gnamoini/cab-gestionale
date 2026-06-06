# Long-session soak baseline (post-fix)

Metodologia per validare degrado client vs carico Supabase dopo i fix long-running.

## Client — Chrome DevTools

| Durata | Metriche | Soglia allarme |
|--------|----------|----------------|
| 30m / 1h / 4h / 8h | `performance.memory.usedJSHeapSize` | +30% in 4h uso normale |
| | DOM nodes, Detached nodes (heap diff) | Crescita monotona |
| | `getCabSyncListenerCount()` | Stabile con modale fermo |
| | React Query Devtools query count | >200 con poche route |
| | Performance → Long tasks | >50ms frequenti in idle |

### Hook browser (dev)

Dopo login in dev/staging:

```js
window.__cabLongSessionMetrics()
```

Restituisce: `cabSyncListeners`, `ricambioSnapshotRegistrySize`, `scortaSyncQueueSize`, `runtimeHealth`, `reactQueryCacheCount`, `heapUsedMb`.

### Script modulo (CI / terminale)

```bash
npm run ops:long-session-soak -- --samples 48 --interval-ms 300000
```

48 campioni × 5 min ≈ 4h di campionamento modulo (heap/RQ richiedono browser).

### Baseline post-fix (snapshot modulo, 2026-06-05)

Esecuzione rapida `npm run ops:long-session-soak` (1 campione):

- `cabSyncListeners`: stabile a 0 in Node (listener solo browser)
- `ricambioSnapshotRegistrySize`: 0 idle
- `scortaSyncQueueSize`: 0 idle
- `runtimeHealth.counters`: tutti 0 in idle

**Gate heap 4h:** documentare in questa sezione `heapUsedMb` inizio/fine da `window.__cabLongSessionMetrics()` ogni 30 min durante uso reale (navigazione lavorazioni, modale schede 30 min, magazzino).

## Supabase — correlazione req/min

| Metrica | Dove | Cosa misura |
|---------|------|-------------|
| API requests/min | Supabase Dashboard → Logs | Polling storm vs Realtime |
| Connessioni Realtime | Supabase Realtime | WS per tab |
| Query lente | Advisors / `pg_stat_statements` | Seq scan bundle schede (pre-lazy) |

### Isolare solo polling (staging)

```env
NEXT_PUBLIC_GESTIONALE_FORCE_POLL=1
```

Forza fallback polling senza WebSocket Realtime. Confrontare req/min con flag off (Realtime connected).

**Atteso post-fix:**

- Realtime connected: req/min basse in idle; picchi su mutazioni
- FORCE_POLL: burst ogni 20–60s (backoff) × ~10–15 query attive per tab — **non** full table schede (lazy per `lavorazioneId`)

### Correlazione soak

1. Tab A: uso normale 4h, Realtime on → annotare req/min media Supabase
2. Tab B: stesso flusso, `FORCE_POLL=1` → annotare req/min
3. Confrontare `heapUsedMb` e `reactQueryCacheCount` da `__cabLongSessionMetrics`

## Regression gate

```bash
npm run ci:tsc
npm run smoke:regression
```

Manuale: CRUD lavorazioni delete → cache evicted; modale schede 30min listener stabile; Security tab permessi realtime; magazzino virtual scroll.
