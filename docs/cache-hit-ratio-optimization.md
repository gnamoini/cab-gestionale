# Cache Hit Ratio Optimization

Dev-only unified telemetry for the asset layer: **PDF artifacts**, **document thumbnails**, **full document delivery**, and **image proxy** transforms. Aggregates HIT/MISS ratios, latency, and MISS hotspots without changing storage architecture or production behavior.

## Enable

| Flag | Effect |
|------|--------|
| `NODE_ENV=development` | Telemetry on by default |
| `NEXT_PUBLIC_ASSET_CACHE_TELEMETRY=1` | Force on in non-production |
| `NEXT_PUBLIC_ASSET_CACHE_WARMUP=0` | Disable smart warmup (telemetry still works) |

Helpers: `isAssetCacheTelemetryEnabled()`, `isAssetCacheWarmupEnabled()` in `lib/observability/config.ts`.

Production: all APIs are no-ops.

## Event catalog

| Field | Values |
|-------|--------|
| `assetType` | `pdf` \| `document` \| `image` \| `thumbnail` |
| `cacheStatus` | `HIT` \| `MISS` \| `REVALIDATED` |
| `source` | `storage` \| `generated` \| `proxy` |

### Status semantics

| Asset | HIT | MISS | REVALIDATED |
|-------|-----|------|-------------|
| PDF | Bytes from Supabase artifact cache | Generated + uploaded | — |
| Thumbnail | Thumbnail found on first lookup | Generated WebP | Found after `contentHash` computed mid-request |
| Document | Storage fetch (no generation) | — | — |
| Image proxy | — | Always server Sharp transform | — |

**Image proxy note:** Application-level status is always `MISS` (server transform). HTTP `Cache-Control: immutable` still helps browser reuse; use `meta.httpCacheImmutable` in events to spot immutable paths.

## Console API

Mounted in development via `AssetCacheDebugMount`:

```js
__GESTIONALE_ASSET_CACHE__.report()
__GESTIONALE_ASSET_CACHE__.hotspots()
__GESTIONALE_ASSET_CACHE__.ratio("pdf")
__GESTIONALE_ASSET_CACHE__.ratioByEntity("documento")
__GESTIONALE_ASSET_CACHE__.latency("thumbnail")
__GESTIONALE_ASSET_CACHE__.events({ assetType: "pdf", limit: 20 })
__GESTIONALE_ASSET_CACHE__.invalidationHints()
__GESTIONALE_ASSET_CACHE__.reset()
```

Ring buffer: last **200** asset accesses.

## Integration points

| Module | Telemetry |
|--------|-----------|
| `deliverPdfArtifact` | PDF HIT/MISS |
| `deliverDocumentPreview` | Thumbnail HIT/MISS/REVALIDATED |
| `deliverDocumentFile` | Document storage fetch |
| `GET /api/media/image` | Image proxy transform |
| `invalidateEntity` | Warmup hints via `noteAssetCacheInvalidation` |

## Smart warmup (dev-only)

No new infrastructure. Debounced background `fetch()` with:

- Max **3** concurrent warmups
- **60s** cooldown per URL
- **2s** debounce after MIC invalidation / page mount

| Trigger | Target |
|---------|--------|
| Report page mount | `report-bundle` PDF |
| Lavorazioni list mount | `lavorazioni-in-corso` PDF |
| Document upload | Archive thumbnail preview |
| Lavorazione doc upload | Lavorazione thumbnail preview |
| MIC invalidation | Re-warm predictable PDFs for report/lavorazione/settings |

## Tuning workflow

1. Run app in development.
2. Exercise mutations (upload, lavorazione update, report refresh).
3. `__GESTIONALE_ASSET_CACHE__.hotspots()` — entities with frequent MISS.
4. `__GESTIONALE_ASSET_CACHE__.report()` — ratio and latency by asset type.
5. Cross-check `__GESTIONALE_RC__.getTrace({ entityId })` for mutation → invalidation → MISS correlation.

## Related systems

- **[MIC](minimal-invalidation-contract.md)** — invalidation drives cache busting; warmup listens via `noteAssetCacheInvalidation`.
- **[Runtime coordination](runtime-coordination-observability.md)** — correlation timelines; asset telemetry adds aggregate ratios.

## Non-goals

- CDN / Vercel cache configuration
- Persistent metrics / external APM
- Server-side LRU for image proxy
- Production warmup scheduling
