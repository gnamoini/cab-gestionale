# ADR-010: Operational Intelligence Platform vs Report AI Narrative

## Status

Accepted — 2026-07-20

## Context

Report AI Narrative v2 spiega segnali insight per `ruleKey` ma non produce un brief operativo decisionale per il responsabile officina. Mancano: periodo operativo, score dedicato, eventi, confidence/evidence, diario strutturato, viste Direttore/Analista.

## Decision

### Nuovo namespace

`lib/operational-intelligence/` — Decision Layer separato da `lib/report/narrative/` (Explanation Layer).

### Nuovo endpoint

`GET /api/report/operational-brief` — non evoluzione di `/narrative`. Deprecazione graduale di narrative quando OIP è stabile.

### Pipeline 4 layer

```
Fact Engine → Insight Engine → Brief Context → AI (narrativa only)
```

### Operational Brief Score

Calcolato deterministicamente — distinto da `lib/dashboard/operational-health-score.ts`.

### Diary RBAC

Brief generation legge diario server-side solo se utente ha `dashboard` read (RLS `rbac_operational_diary_dashboard_read`). Nessun bypass service role.

### Feature flag

`operationalBriefEnabled` — default ON. UI preferisce OIP > narrative v2 > legacy.

## Consequences

- Narrative v2 resta disponibile come fallback
- Storico brief in `operational_periods` + `operational_briefs` (P2)
- Diario classification: heuristic P1, colonne DB P2

## Migration

1. P0: fix regressioni narrative (diary, compliance, labels)
2. P1: OperationalBriefEngine + UI
3. P2: persistence + PDF
4. P3: assistant Q&A
