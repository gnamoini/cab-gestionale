# CAB FASE 10 — Supported Document Types

| Tipo | Significato | Schema | CAB enabled | Note |
|------|-----------|--------|-------------|------|
| TD01 | Fattura | SUPPORTED | ENABLED | Ciclo attivo standard |
| TD02 | Acconto su fattura | SUPPORTED | DISABLED | Non esposto UI CAB |
| TD03 | Acconto su parcella | SUPPORTED | DISABLED | Non esposto UI CAB |
| TD04 | Nota di credito | SUPPORTED | ENABLED | Richiede fattura collegata |
| TD05 | Nota di debito | SUPPORTED | ENABLED | Richiede fattura collegata |
| TD06 | Parcella | SUPPORTED | DISABLED | Non esposto UI CAB |
| TD16–TD23 | Integrazioni/autofatture | SUPPORTED | DISABLED | Rappresentabili, non ciclo attivo |
| TD24 | Fattura differita lett. a) | SUPPORTED | ENABLED | Richiede DDT |
| TD25 | Fattura differita lett. b) | SUPPORTED | ENABLED | Richiede DDT |
| TD26–TD28 | Casi speciali | SUPPORTED | DISABLED | Non ciclo attivo CAB |

## Transmission formats

| Format | Destinatario |
|--------|--------------|
| FPR12 | Privati / B2B |
| FPA12 | Pubblica Amministrazione |

Formato determinato da anagrafica — non selezione manuale incoerente.
