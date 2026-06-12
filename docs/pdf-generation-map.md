# PDF generation map

Server-side artifact pipeline — jsPDF on Node, content-addressed storage, RBAC-gated delivery.

## Classification

| Class | Artifact type | DTO / data source | Route |
|-------|---------------|-------------------|-------|
| REPORT | `lavorazioni-in-corso` | LIGHT `LavorazioneListRow` via `getLavorazioniAttiveLightServer` | `/api/pdf/artifacts/lavorazioni-in-corso` |
| REPORT | `report-bundle` | REPORT bundle server fetch | `/api/pdf/artifacts/report-bundle` |
| REPORT | `dipendenti-aziendale` | Timesheet rows server | `/api/pdf/artifacts/dipendenti-aziendale?month=YYYY-MM` |
| REPORT | `dipendenti-dipendente` | Timesheet + employee id | `/api/pdf/artifacts/dipendenti-dipendente?month=&employeeId=` |
| DOCUMENT | `preventivo` | `PreventivoRecord` server | `/api/pdf/artifacts/preventivo?id=` |
| DOCUMENT | `scheda-ingresso` / `scheda-lavorazioni` / `scheda-ricambi` | Scheda bundle server | `/api/pdf/artifacts/scheda-*?lavorazioneId=` |
| DOCUMENT | `bunder` | `BunderCommercialDocument` server | `/api/pdf/artifacts/bunder?id=` |
| STORED | User uploads | — | Supabase `documenti` (unchanged) |
| UTILITY | `POST /api/pdf/preview` | Pass-through | Deprecated after migration |

## Pipeline

```
DTO server fetch → stableHashPayload → storage lookup
  → miss: generateXxxPdfBytes (jsPDF) → upload → respond
  → hit: stream bytes (X-Cache-Status: HIT)
```

## Client entry

[`lib/pdf/request-pdf-artifact.ts`](../lib/pdf/request-pdf-artifact.ts) — `openPdfArtifact(type, params)` opens GET URL in new tab.

## Hard rules

- No client jsPDF generation for migrated types
- No raw DB queries outside `*-fetch-server.ts` / artifact generate modules
- Artifacts immutable per `dataHash`
