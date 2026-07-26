# Tagliandi Integrati — Audit dominio

## SSOT

- **Esecuzione:** `lavorazioni` + schede (unica origine eventi)
- **Servizio Effettivo:** `vehicle_maintenance_services` (non `maintenance_events` tabella)
- **Servizio Pianificato:** `vehicle_maintenance_configs` + `vehicle_maintenance_forecasts`
- **Compliance:** solo su `preset_snapshot` persistito (R1)

## Tabelle

| Tabella | Ruolo |
|---------|-------|
| `lavorazioni` | `is_tagliando`, `maintenance_execution_kind`, `repair_present` |
| `vehicle_maintenance_services` | Evento tagliando (Servizio Effettivo) |
| `vehicle_maintenance_service_parts` | Ricambi per evento |
| `vehicle_maintenance_configs` | Preset assegnato al mezzo |
| `maintenance_plans` | Definizione preset |
| `maintenance_preset_*` | Versioni, trigger, checklist |
| `maintenance_audit_events` | Audit preset/esecuzione/compliance |
| `maintenance_events` | VIEW read-only su services |

## Path registrazione manuale — RIMOSSI

| Path | Stato |
|------|-------|
| `MezziRegistraTagliandoModal` | Eliminato |
| `mezzi-hub-tagliandi-tab` pulsante Registra | Rimosso |
| `useRegisterExecutionV2Mutation` da UI Mezzi | Rimosso |
| `toggleMatrixMilestone` (v1) | Dead path — cleanup futuro |

## Generazione evento

Unico path: `complete_lavorazione_tagliando` RPC al passaggio `stato → completata` con `is_tagliando=true`.

## Regression

`lib/regression/tagliandi-no-manual-registration-audit.test.ts` — zero import UI registrazione manuale.
