# Stampa etichette magazzino — officina

Checklist operativa per stampa fisica (non automatizzata in CI).

## Impostazioni stampante

| Impostazione | Valore |
|--------------|--------|
| Scala | **100%** (nessun “Adatta alla pagina”) |
| Margini | Predefiniti o minimi |
| Orientamento | Verticale (A4) |
| Qualità | Normale o alta |

## Preset consigliati

| Contesto | Preset |
|----------|--------|
| Scansione QR mobile | **60×40** o superiore |
| Etichetta compatta scaffale | 50×30 (verificare lettura QR) |
| Etichetta ampia pallet | 80×50 / 95×40 |

## Verifica prima della produzione

1. **QR:** scansione con fotocamera smartphone su 3 etichette campione
2. **Barcode Code128:** lettura con pistola barcode su codice OE principale
3. **Testo:** marca, descrizione e codici leggibili senza taglio
4. **Allineamento:** bordo di taglio visibile se preset include cut border

## Stampanti termiche

- Usare driver “dimensione reale” / 100% — evitare ridimensionamento automatico
- Verificare DPI driver (300 DPI target pipeline server)
- Per etichette singole su rotolo: preferire export PNG e stampa da viewer
- QA residuo: calibrazione mm su hardware specifico (non coperto da test automatici)

## Bulk A4

Il PDF bulk posiziona etichette su griglia A4 (`labelsPerA4Page` per preset).  
Dopo generazione: aprire PDF, confermare **100%** in anteprima stampa, poi stampa.

Vedi anche: [`inventory-labels.md`](./inventory-labels.md), [`adr/ADR-006-inventory-label-pdf-raster-pipeline.md`](./adr/ADR-006-inventory-label-pdf-raster-pipeline.md)
