# Document intelligence — performance impact

## Targets

| Metric | Policy |
|--------|--------|
| List render | No preview network until row enters viewport (`IntersectionObserver`) |
| Storage reads in list | 0 full PDF reads; at most 1 WebP per visible row |
| Thumbnail HTTP | `Cache-Control: public, max-age=31536000, immutable` |
| Dedup | Identical bytes → single `blobs/{hash}` object |

## Measurement headers

`GET /api/documents/:id/preview` returns:

| Header | Meaning |
|--------|---------|
| `X-Preview-Status` | `HIT` (storage) or `MISS` (generated this request) |
| `X-Preview-Generate-Ms` | Wall time including auth, storage, generation |

On `HIT`, generation cost is near zero for the client; header still reflects server resolve time.

## Generation limits

- Max source size for on-request generation: 20 MB (`DOCUMENT_THUMB_MAX_BYTES_FOR_GENERATE`)
- Thumbnail max width: 320 px WebP q≈80
- Unsupported types (Office, etc.): `hasPreview: false` → list shows glyph fallback

## List query cache

Archive list keeps existing React Query `staleTime` (5 min) — metadata only; previews are orthogonal lazy fetches.

## Risks

| Risk | Mitigation |
|------|------------|
| sharp PDF unsupported | `hasPreview=false` + DocGlyph; monitor `X-Preview-Status: MISS` failures |
| Large PDF thumb timeout | Skip >20 MB; warm via post-upload optional fetch |
| Dedup + legacy paths | Refcount delete only for `blobs/` prefix |
