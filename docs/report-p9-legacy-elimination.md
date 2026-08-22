# P9 — Legacy Elimination & Report Ownership

## Principle

`/report` = **BI Center only**. Operational specialist analytics live on owner modules after surface verification.

## Ownership SSOT

- `lib/report/legacy/report-data-ownership.ts`
- Readiness: `READY` | `NEEDS_OWNER_SURFACE` | `REMOVED` | `FUTURE_CAPABILITY`
- P9 gate: `isP9EliminationGatePassed()` when `countReportResiduals() === 0`

## §2 Owner-surface audit (closure)

| Element | Owner route | Surface | RBAC | Readiness |
|---------|-------------|---------|------|-----------|
| WIP/aging/SLA | `/lavorazioni` | `lavorazioni-operational-panel.tsx` | lavorazioni | READY |
| Stock/consumi | `/magazzino` | `magazzino-operational-panel.tsx` | magazzino | READY |
| Flotta/recidività | `/mezzi` | `mezzi-operational-panel.tsx` | mezzi, lavorazioni | READY |
| Ore/officina | `/dipendenti` | `dipendenti-operational-panel.tsx` | dipendenti | READY |
| Year matrix | — | — | — | REMOVED |
| analisi_ai | — | P4 + P8 | — | REMOVED |
| Cross scatter/matrices | — | — | — | REMOVED |

## BI CTAs (READY only)

`ReportModuleOwnerCta` in Advanced domain sections links to owner modules.

## Removed from /report

- `LegacyBlockedAccordion` / `legacy-blocked/*`
- `ReportSections` mount
- "Analisi legacy" details

## Guards

- `lib/regression/report-no-legacy-surface.test.ts`
- `lib/report/legacy/report-data-ownership.test.ts`
- Control: `governance.report.p9.legacy-elimination`
