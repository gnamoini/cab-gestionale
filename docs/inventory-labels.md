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
| `inventory_label_events` | Generazione, download, stampa |
| `inventory_label_artifacts` | Cache hash → `storage_path` |
| `label_generation_jobs` | Bulk async >100 etichette |

## Modulo

SSOT: [`lib/inventory-labels/`](../lib/inventory-labels/)

- `domain/` — token, template JSON, fingerprint
- `render/` — PNG (sharp 300 DPI), SVG, PDF (jsPDF)
- `audit/` — eventi e scansioni
- `storage/` — artifact su bucket `pdf-artifacts` path `inventory-labels/…`

## API

| Route | Metodo | Descrizione |
|-------|--------|-------------|
| `/api/inventory-labels/ricambi/[id]` | GET | Metadata token + URL QR |
| `/api/inventory-labels/ricambi/[id]/render` | GET | `?format=png\|svg\|pdf&preset=` |
| `/api/inventory-labels/ricambi/[id]/regenerate` | POST | Revoca + nuovo token |
| `/api/inventory-labels/bulk` | POST | Sync PDF ≤100, job async >100 |
| `/api/inventory-labels/bulk/jobs/[id]` | GET | Poll / download job |

## Preset etichetta

40×20, 50×30, 60×40, 70×50, 80×50 mm — definiti in `domain/templates.ts` (`computeLabelLayout`).

**Layout (v1.4.0):** QR grande a sinistra; a destra marca, descrizione e codice (codice centrato tra fondo QR e barcode); barcode full-width in basso. Testo a capo senza ellissi.

| Preset | QR tipico | Default |
|--------|-----------|---------|
| 50×30 | ~14 mm | |
| **60×40** | **~21 mm** | **sì** |
| 70×50+ | 22+ mm | |

Per scansione affidabile con fotocamera mobile usare **60×40** o superiori.

Campi etichetta: **marca**, **descrizione**, **codice**, QR (EC level Q, quiet zone 2 moduli), Code128.  
Esclusi: prezzo, quantità, costo, fornitore, note.

`GENERATOR_VERSION` `1.3.0` invalida cache artifact al primo download post-aggiornamento.

## Estensione futura

`entity_type` su token/artifact permette: attrezzature, scaffali, ubicazioni, GS1, NFC senza refactor del redirect `/r/:token`.
