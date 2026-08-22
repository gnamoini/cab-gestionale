# P8 Ask Report

Conversational read-only layer over certified BI tools.

## Architecture

```text
User → API → effective context → Intent (deterministic | LLM planner)
→ registered tools → server validation → tool results + provenance
→ answer synthesis → validator → response + citations
```

**LLM ≠ DB / Analytics / RBAC / Decision Center**

## Corrections (C1–C7)

| ID | Rule |
|----|------|
| C1 | Client-carried `conversationContext` is SSOT; in-memory cache is optimization only |
| C2 | Cache keyed `userId:conversationId` |
| C3 | Tool args fully server-validated via Zod + `normalizeArgs` |
| C4 | Heuristic intent first; LLM planner only when ambiguous |
| C5 | Drill-down tier 3 — last resort only |
| C6 | Tool `provenance` on every result for validator |
| C7 | Client period untrusted — `resolveEffectiveContext` |

## Tools (read-only)

| Tier | Tool |
|------|------|
| 1 | `get_metric`, `get_series`, `get_insights` |
| 2 | `get_breakdown`, `get_operational_context`, `get_decisions` |
| 3 | `get_drilldown` |

## API

`POST /api/report/ask-report` — report read RBAC, rate limited.

## UI

- Toolbar button + `#bi-ask` section
- Drawer panel (desktop), conversation context round-trip
- Citations → P3 drill-down

## Limitations (V1)

- No write tools
- No DB conversation persistence
- Deterministic answer synthesis (LLM planner deferred for simple paths)
- No streaming
