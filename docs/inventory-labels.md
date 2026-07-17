# Inventory Identification Layer

Sistema di identificazione digitale per ricambi magazzino: token QR stabili, redirect `/r/:token`, etichette server-side (PNG/SVG/PDF + Code128), cache artifact, audit separato scansioni/eventi.

## Flusso QR

1. Etichetta contiene `{origin}/r/{token}` (token testuale, es. `CAB-8K4J9P2X7M`)
2. `GET /r/:token` → auth → lookup `inventory_qr_tokens` (una query) → insert `inventory_qr_scans`
3. Redirect `302` → `/magazzino?openRicambio={id}&source=qr`
4. Modale **Scheda ricambio** esistente si apre

## Schema DB

| Tabella | Scopo |
|---------|--------|
| `inventory_qr_tokens` | Token pubblico + lifecycle (`active` / `revoked` / `expired`) |
| `inventory_qr_scans` | Scansioni (alto volume) |
| `inventory_label_events` | Generazione, download, stampa, audit bulk PDF |
| `inventory_label_artifacts` | Cache hash → `storage_path` |
| `label_generation_jobs` | Bulk async &gt; sync max (`progress`, `error_code`) |

## Modulo

SSOT: [`lib/inventory-labels/`](../lib/inventory-labels/)

- `domain/` — token, template JSON, fingerprint
- `render/` — PNG (sharp 300 DPI), SVG, PDF (jsPDF), pipeline fallback
- `audit/` — eventi e scansioni
- `storage/` — artifact su bucket `pdf-artifacts` path `inventory-labels/…`

## API

| Route | Metodo | Descrizione |
|-------|--------|-------------|
| `/api/inventory-labels/ricambi/[id]` | GET | Metadata token + URL QR |
| `/api/inventory-labels/ricambi/[id]/render` | GET | `?format=png\|svg\|pdf&preset=` |
| `/api/inventory-labels/ricambi/[id]/regenerate` | POST | Revoca + nuovo token |
| `/api/inventory-labels/bulk` | POST | Sync PDF ≤20 (default), job async oltre |
| `/api/inventory-labels/bulk/jobs/[id]` | GET | Poll `progress` / download PDF o ZIP |

## Preset etichetta

40×20, 50×30, 60×40, 70×50, 80×40, 80×50 mm — definiti in `domain/templates.ts` (`computeLabelLayout`).

**Layout (v1.5.0):** QR grande a sinistra; barcode Code128 sotto il QR; a destra:

1. **Alto:** marche unite (`BTE / OMB`), descrizione, codice OE principale `XXXX (BTE)`, codice OE secondario `YYYY (OMB)` se presente
2. **Basso (fascia barcode):** fornitore alternativo + codice fornitore ancorati al bordo inferiore etichetta, accanto al barcode

Font DejaVu (`LabelSans` / `LabelMono`): testo rasterizzato come path SVG (opentype + TTF) per PNG/PDF — niente fontconfig su Vercel. Download SVG browser usa ancora `@font-face` WOFF2.

| Preset | QR tipico | Default |
|--------|-----------|---------|
| 50×30 | ~14 mm | |
| **60×40** | **~21 mm** | **sì** |
| 70×50+ | 22+ mm | |

Per scansione affidabile con fotocamera mobile usare **60×40** o superiori.

Campi etichetta: **marca** (+ secondaria), **descrizione**, **codice** (+ secondario OE), fornitore/codice alternativo, QR (EC level Q, quiet zone 2 moduli), Code128.  
Esclusi: prezzo, quantità, costo, fornitore principale, note.

`GENERATOR_VERSION` invalida cache artifact al primo download post-aggiornamento.

**Produzione:** il bucket `pdf-artifacts` deve accettare `application/pdf`, `image/png`, `image/svg+xml` (migration `20260917120200_pdf_artifacts_inventory_label_mime_types.sql`). Senza PNG/SVG la cache fallisce; con `uploadLabelArtifactBestEffort` la consegna resta comunque possibile.

## Env vars & troubleshooting

| Variable | Default | Effect |
|----------|---------|--------|
| `INVENTORY_LABEL_PDF_PIPELINE_V2` | `1` | `0` = legacy font-embed path (rollback) |
| `LABEL_PDF_RENDER_CONCURRENCY` | `4` | Parallel sharp raster (2–8) |
| `LABEL_BULK_SYNC_MAX` | `20` | Max labels in sync HTTP response |
| `LABEL_PDF_GENERATION_TIMEOUT_MS` | `240000` | Server generation timeout |

**Bulk:** ≤ sync max → PDF/ZIP in one response; above → `202 { jobId }` + poll `progress`. UI: preparing → generating (%) → downloading.

**Benchmark:** `npm run benchmark:label-pdf-memory`

**Gemini Import AI:** [ADR-007](./adr/ADR-007-gemini-env-runtime-resolution.md) — `GET/POST /api/ops/ai-configuration`, `npm run check-production-config`

**PDF pipeline:** [ADR-006](./adr/ADR-006-inventory-label-pdf-raster-pipeline.md)

## Estensione futura

`entity_type` su token/artifact permette: attrezzature, scaffali, ubicazioni, GS1, NFC senza refactor del redirect `/r/:token`.
