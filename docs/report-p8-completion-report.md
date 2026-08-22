# P8 Completion Report — Ask Report

## §1 Baseline

| Gate | Result |
|------|--------|
| `npm run ci:tsc` | PASS (post-implementation) |
| P7 suite | PASS |
| P8 core tests | PASS |

## §2 Architecture

User → Intent → Certified Tools → Validation → Answer + Citations → Drill-down

## §3 Tool registry

| Tool | Tier | RBAC |
|------|------|------|
| get_metric | 1 | report read |
| get_series | 1 | report read |
| get_insights | 1 | report read |
| get_breakdown | 2 | report read |
| get_operational_context | 2 | report read |
| get_decisions | 2 | report read |
| get_drilldown | 3 | report read + module |

## §4 Supported questions

Metric, trend, comparison, breakdown (cliente), insights, decisions, operational context, drill-down (explicit).

## §5 Security

RBAC on API + tools; forbidden SQL/table args rejected; userId+conversationId cache isolation.

## §6 Validation

Numeric/trust/causal/SQL checks via P4 narrative stack + provenance.

## §7 UI

Drawer panel, toolbar trigger, `#bi-ask` nav, citations → drill-down.

## §8 Performance

No Ask API on `/report` initial load; query on first message only.

## §9 Tests

| Gate | Result |
|------|--------|
| P8 unit | PASS |
| Regression | PASS |
| E2E | BLOCKED_EXTERNAL_ENV without SMOKE_ADMIN_* |

## §10 Deferred

- LLM planner + answer synthesis for ambiguous multi-tool paths
- Streaming
- DB conversation persistence
