# Performance Regression Report

Generated: 2026-08-21T22:16:16.320Z

## P0 — Regressioni critiche
- **/report**: payloadKb 68.91 exceeds budget ceiling 48
  - Evidenza: hard budget max 48
  - Fix proposto: Ridurre payload/query count o rivedere budget SSOT con evidenza snapshot
- **/mezzi**: payloadKb 40.19 exceeds budget ceiling 32
  - Evidenza: hard budget max 32
  - Fix proposto: Ridurre payload/query count o rivedere budget SSOT con evidenza snapshot
- **/magazzino**: payloadKb 73.88 exceeds budget ceiling 15
  - Evidenza: hard budget max 15
  - Fix proposto: Ridurre payload/query count o rivedere budget SSOT con evidenza snapshot

## P1 — Regressioni importanti
- Nessun warning.

## P2 — Advisory (dev-only)
- Nessun advisory da render/query frequency in questa run.

## Delta summary

| Route | Metric | Before | After | Delta % | Severity |
|-------|--------|--------|-------|---------|----------|
| /lavorazioni | payloadKb | 4.68 | 4.68 | 0% | ok |
| /lavorazioni | queryCount | 2 | 2 | 0% | ok |
| /lavorazioni | serverExecutionMs | null | null | n/a% | info |
| /report | payloadKb | 68.91 | 68.91 | 0% | ok |
| /report | queryCount | 6 | 6 | 0% | ok |
| /report | serverExecutionMs | null | null | n/a% | info |
| /mezzi | payloadKb | 40.19 | 40.19 | 0% | ok |
| /mezzi | queryCount | 1 | 1 | 0% | ok |
| /mezzi | serverExecutionMs | null | null | n/a% | info |
| /magazzino | payloadKb | 73.88 | 73.88 | 0% | ok |
| /magazzino | queryCount | 2 | 2 | 0% | ok |
| /magazzino | serverExecutionMs | null | null | n/a% | info |
| /dashboard | payloadKb | 4.68 | 4.68 | 0% | ok |
| /dashboard | queryCount | 4 | 4 | 0% | ok |
| /dashboard | serverExecutionMs | null | null | n/a% | info |
| /documenti | payloadKb | 0 | 0 | n/a% | info |
| /documenti | queryCount | 3 | 3 | 0% | ok |
| /documenti | serverExecutionMs | null | null | n/a% | info |
| /impostazioni | payloadKb | null | null | n/a% | info |
| /impostazioni | queryCount | 1 | 1 | 0% | ok |
| /impostazioni | serverExecutionMs | null | null | n/a% | info |
| /sicurezza | payloadKb | null | null | n/a% | info |
| /sicurezza | queryCount | 2 | 2 | 0% | ok |
| /sicurezza | serverExecutionMs | null | null | n/a% | info |
| /lavorazioni-clienti | payloadKb | null | null | n/a% | info |
| /lavorazioni-clienti | queryCount | 2 | 2 | 0% | ok |
| /lavorazioni-clienti | serverExecutionMs | null | null | n/a% | info |
| /login | payloadKb | null | null | n/a% | info |
| /login | queryCount | 0 | 0 | n/a% | info |
| /login | serverExecutionMs | null | null | n/a% | info |
| /privacy-policy | payloadKb | null | null | n/a% | info |
| /privacy-policy | queryCount | 0 | 0 | n/a% | info |
| /privacy-policy | serverExecutionMs | null | null | n/a% | info |
| /offline | payloadKb | null | null | n/a% | info |
| /offline | queryCount | 0 | 0 | n/a% | info |
| /offline | serverExecutionMs | null | null | n/a% | info |
