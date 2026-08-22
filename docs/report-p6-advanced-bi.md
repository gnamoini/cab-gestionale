# P6 Advanced BI UI

## § Audit (P6-A)

| Block | Decision |
| ----- | -------- |
| Executive Overview | MERGE — single shell; embedded boundary |
| Insight strip | KEEP — Level-1 **before** Primary Trend (attention-first) |
| Primary Trend | REFINE — selector, compare label, drill-down |
| Operational Context | KEEP — P5 frozen |
| Domain KPI grids | REFINE → Advanced Analysis (desktop visible) |
| Cross-domain | NEW — deltas only, no UI prose |
| Historical / Timeline / Business Report | KEEP — order below Advanced |
| Legacy `<details>` | DEFER |
| `report-timeline-section.tsx` | REMOVE — stub only |
| Double ShellCard executive | MERGE |

**Level-1 order (signed off):** Executive → Insight → Trend → Context

## Information architecture

See plan: Advanced Analysis desktop-visible with collapsible domains; mobile collapsed.

## Multi-metric contract

`direct_overlay` | `dual_scale` | `indexed` | `blocked` — SSOT: `lib/report/bi-center/resolve-multi-metric-display-mode.ts`

## Cross-domain rule

No interpretive sentences in React. Certified deltas or engine DTO only.

## Performance

Compare P5 vs P6 in completion report §6 (Network tab).

## BLOCKED (P6.1)

- Quote conversion rate
- ABC / rotation partial trust
- Margin waterfall
- Client-side indexed normalization
