# fleet-pack @ 1.0.0

## Raw metrics

| id | label | source |
|----|-------|--------|
| `raw_mezzi_totali` | Mezzi anagrafica | mezzi |
| `raw_mezzi_in_officina` | In officina | lavorazioni aperte |
| `raw_giorni_fermo` | Giorni fermo | lav ingresso→uscita |
| `raw_guasti_euristici` | Guasti (regex) | lav descrizione |

## Indicators

| id | formula |
|----|---------|
| `ind_disponibilita_pct` | mezzi_operativi / totali × 100 |
| `ind_mtbf_giorni` | giorni medi tra guasti per mezzo |
| `ind_costo_cumulato_mezzo` | Σ costi per mezzo |

## Business KPIs

| id | tier | dimension | question |
|----|------|-----------|----------|
| `kpi_disponibilita_flotta` | operational | quality | Quanto è disponibile la flotta? |
| `kpi_mezzi_fermi` | operational | volume | Quanti mezzi sono fermi? |
| `kpi_affidabilita_flotta` | tactical | quality | Quali mezzi guastano spesso? |
| `kpi_costo_medio_mezzo` | tactical | efficiency | Quali mezzi costano di più? |
| `kpi_salute_flotta` | strategic | efficiency | La flotta è sana? |

Threshold: `fleet_availability` (policy)

Asset lifecycle KPIs (compliance, idle, km) → estensione fleet-pack v1.1
