# P7 AI Decision Center

Deterministic-first decision support layer for Report BI.

## Pipeline

```text
Analytics → Insight → Operational summary → Candidate → Priority → Evidence
  → AI wording (optional) → Validation → Decision Center → Human status
```

## Corrections (C1–C6)

| ID | Rule |
|----|------|
| C1 | Generated fields upserted; user status preserved on regeneration |
| C2 | Entity-aware `candidate_fingerprint` |
| C3 | GET is lightweight — no full timeline rebuild |
| C4 | `DECISION_ENGINE_VERSION` + `PRIORITY_MODEL_VERSION` per row |
| C5 | AI adjusts wording only — canonical fields from candidate |
| C6 | `dismissed` hidden until `condition_hash` changes |

## State machine

`new` → `acknowledged` | `monitoring` | `dismissed`  
`acknowledged` → `monitoring` | `resolved` | `dismissed`  
`monitoring` → `resolved` | `dismissed`  
`resolved` / `dismissed` terminal (dismissed may resurface per C6)

## API

| Route | RBAC |
|-------|------|
| `GET /api/report/decision-center` | report read |
| `PATCH /api/report/decision-center/[id]` | report write |

## Mount order (P7)

Executive → Trend → Insight → Context → Advanced → **Decisioni** → Historical → Timeline → Business Report

## P4 bridge

Business Report decisions ingested via `candidateFingerprint` + `sourceReportRunId`. Detail view links to `#bi-decisions` — no duplicate workflow cards.

## P8 readiness

Decision Center exposes stable fingerprints and evidence blocks suitable for future Ask Report grounding.
