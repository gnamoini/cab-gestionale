# Image performance impact

Measurement checklist after hybrid media refactor (upload variants + `/api/media` proxy).

## Before / after comparison

| Route | Metric | How to measure | Expected delta |
|-------|--------|----------------|----------------|
| Global shell | LCP (logo) | Lighthouse, Vercel Speed Insights | −20–40% bytes on custom branding; default PNG skipped (< 150 KB) |
| Client portal `/lavorazioni-clienti` | Image + query requests on cold list | Network tab, `__cabQueryFetchAudit()` | −N photo list fetches until row visible (lazy IO) |
| Lav/mezzi/mag modals | KB per thumb | DevTools transfer on `.thumb.webp` | −60–80% vs legacy 1600px JPEG |
| Modal detail preview | KB per open | `/api/media/image?w=1200` | Responsive srcset; AVIF when supported |
| Report | Image KB | N/A | No raster images |

## Per-route image inventory

See [`image-inventory-map.md`](image-inventory-map.md).

## Lighthouse checklist

1. Open `/dashboard` logged in — note LCP element (expect `CabLogo` or text).
2. Open `/lavorazioni-clienti` — count image requests before scroll vs after scroll into photo column.
3. Open lavorazione modal → Foto tab — thumb transfer size ≤ ~15 KB each (WebP 256px).
4. Open photo preview — single detail request with `w=1200` (cached immutable on repeat).

## Targets (indicative)

| Metric | Target |
|--------|--------|
| Thumb transfer | 256px WebP vs 1600px JPEG |
| Client portal cold list photo queries | Only visible rows (IO + `lazy` default) |
| CLS on thumbs | Fixed 64×64 / 48×48 boxes + skeleton |
| CDN cache hit | `Cache-Control: immutable` on `/api/media/image` for timestamped paths |

## Remaining bottlenecks

- Legacy `.jpg` objects until re-upload (proxy resizes on the fly)
- Custom branding SVG stored as-is (no raster conversion)
- QR dialog PNG data URLs (functional, out of scope)
- PDF embedded logos (separate path)
- First proxy hit cold-start (`sharp` on serverless)

## Hard rule audit

| Asset | Size | Action taken |
|-------|------|--------------|
| `public/cab-logo.png` | ~7.4 KB | No static AVIF/WebP generated; `next/image` quality 75 |
