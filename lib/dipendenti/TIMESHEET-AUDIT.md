# Dipendenti Timesheet — Audit logico dati

## Flusso dati

```
Impostazioni (addettiRecords)
  → syncFromAddettiRecords / bootstrapEmployees
  → dipendenti_timesheet_employees (registry snapshot)
  → upsertEntry (inserimento manuale UI)
  → dipendenti_timesheet_entries (entry giornaliere + snapshot nome)
  → KPI (timesheet-kpi) / PDF / Scheda dipendente
```

Tutte le statistiche e i report derivano **esclusivamente** da `dipendenti_timesheet_entries` e dal registry collegato. Nessuna integrazione con lavorazioni, magazzino o report analytics.

## Identità dipendente

| Campo | Ruolo |
|-------|--------|
| `dipendenti_timesheet_employees.id` | FK stabile per le entry (`dipendente_id`) |
| `source_addetto_id` | Link all'addetto in `app_settings` |
| `in_settings` | `true` = attivo in Impostazioni; `false` = storico |
| `employee_display_name_snapshot` (su entry) | Nome al momento del save; immutabile per export |

## Regole storico

- **Rename addetto:** `display_name` registry aggiornato solo se `in_settings`; entry passate mantengono snapshot.
- **Remove addetto:** riga registry resta con `in_settings=false`; visibile solo nei periodi con ore registrate; addetti attuali sempre nel periodo corrente.
- **Delete-if-empty:** entry con tutti zeri e note vuote viene eliminata (no righe fantasma).

## RBAC

| Operazione | Permesso |
|------------|----------|
| Lettura registry/entries | `dipendenti` read |
| Upsert/delete entry, sync registry | `dipendenti` write |
| Export PDF preview API | `dipendenti` read (o preventivi/lavorazioni read) |

## Scorecard target (≥ 8/10)

| Dimensione | Verifica |
|------------|----------|
| UX | Inserimento 8h in ≤3 click (preset); debounce 400ms; mobile schede giornaliere |
| Data integrity | Snapshot su entry; storico post-remove; no demo bootstrap fuori app_settings |
| Performance | Griglia N×30 con React Query cache; debounce per cella |
| Maintainability | `TimesheetCellEditor` unico; design system tabelle/toolbar/modal |
