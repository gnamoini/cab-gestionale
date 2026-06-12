# API Shape Field Matrix

Misurazioni e gap campi per endpoint core (post Light/Detail refactor). Fonti: `lib/db/table-select-columns.ts`, fetch layer, consumer UI.

| Endpoint | Fetched (default) | Used in UI | Gap / note |
|----------|-------------------|------------|------------|
| Lavorazioni list (`light`) | `LAVORAZIONI_LIST_LIGHT_COLUMNS` + `MEZZI_EMBED_LIGHT_COLUMNS` | tabella/kanban: identità mezzo 7 campi; profili solo mobile lazy | `entity_key`, `tipo_attrezzatura`, `anno` in embed; profili omit in lista |
| Lavorazioni list (`detail`) | `LAVORAZIONI_DETAIL_COLUMNS` + profili + embed legacy | portale clienti, modali | payload pieno — uso esplicito |
| Lavorazioni list (`report`) | `LAVORAZIONI_REPORT_LIGHT_COLUMNS`, no embed | KPI report via join `mezziById` | mezzo join client-side |
| Mezzi list | `MEZZI_LIST_LIGHT_COLUMNS` | tabella: identity + sort | `meta` solo modal (`getById`) |
| Mezzi report | `MEZZI_REPORT_LIGHT_COLUMNS` | classifiche/KPI report | no `meta`, no timestamps |
| Magazzino list pagina | `MAGAZZINO_RICAMBI_COLUMNS` | tabella virtualizzata densa | invariato |
| Magazzino report/dashboard | `MAGAZZINO_REPORT_LIGHT_COLUMNS` | widget KPI | subset sufficiente per selector |
| Report bundle | lav report + mezzi report + mag report + mov | adapter integrity layer | niente duplicazione embed mezzo in lav |

## File SSOT

- Colonne: `lib/db/table-select-columns.ts`
- Mapper: `lib/db/dto-mappers.ts`
- Fetch lavorazioni: `lib/lavorazioni/lavorazioni-list-fetch.ts`
- Mezzi: `src/services/mezzi.service.ts`
- Report: `lib/report/use-report-live-data.ts`
