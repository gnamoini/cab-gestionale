# Report Analytics UX Audit

Audit delle 11 area Report — stato post-refactor narrativo (completamento 6 aree).

---

## Tabella verifica 11 aree

| Area | Story flow | Layout data-driven | KPI SSOT | Chart SSOT | Copy semplice | No collapse |
|------|------------|-------------------|----------|------------|---------------|-------------|
| Panoramica | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lavorazioni | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Magazzino | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dipendenti | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Preventivi | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mezzi | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Economia | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Clienti | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trasversali | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contesto | ✅ | ✅ | — | — | ✅ | ✅ |
| AI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Panoramica (`/report/panoramica`)

| | |
|---|---|
| **Cosa c'era** | 4 blocchi stack (`ReportExecutiveOverview`, `ReportPrimaryTrendSection`, `ReportV2InsightBoundary`, `ReportHistoricalTrendSection`) ciascuno con `ReportAnalysisSectionShell` |
| **Accorpato** | Executive + trend + insight + storico in un flusso `ReportStorySection` |
| **Spostato** | Orchestrazione in `report-area-panoramica-view.tsx`; contenuti in `*Content` exports |
| **Eliminato** | 4 shell collapsible; titoli "Insight", "Trend storico" come sezioni isolate |
| **Standardizzato** | `getReportStoryCopy(pan-*)`, `ReportLayoutMainAside` per andamento |

---

## Lavorazioni (`/report/lavorazioni`) — riferimento

| | |
|---|---|
| **Stato** | Pilota completato in precedenza — area view orchestra KPI, aging, SLA, dettaglio |
| **Pattern** | `ReportStorySection` + `ReportLayoutMainAside` / `ReportLayoutSplit` + primitive DS |

---

## Magazzino / Dipendenti / Mezzi / AI

| | |
|---|---|
| **Stato** | Completate in precedenza; aggiornate con `ReportLayoutDetail` dove necessario per governance |
| **Pattern** | Area view = narrativa; child = contenuto o embed |

---

## Preventivi (`/report/preventivi`)

| | |
|---|---|
| **Cosa c'era** | `ReportPreventiviSection` monolite collapsed con KPI + trend + funnel |
| **Accorpato** | KPI situazione; trend + aside accettazione; distribuzione accettazione; tabella dettaglio |
| **Spostato** | `useRegisterAnalyticsSection` e `ReportStorySection` in area view |
| **Eliminato** | Shell monolite; copy "Funnel preventivi", "pipeline" |
| **Standardizzato** | `ReportPreventiviAccettazioneChart`, `ReportAnalyticsKpi`, `formatReportCompareLine` |

---

## Economia (`/report/economia`)

| | |
|---|---|
| **Cosa c'era** | `ReportEconomiaSection` monolite con grid 2-col interna |
| **Accorpato** | 5 story sections: situazione → andamento → incassi → distribuzione → dettaglio |
| **Spostato** | Chart panel spezzato in `ReportEconomiaRevenueTrendChart`, `ArAging`, `ClienteHeatmap` |
| **Eliminato** | Shell collapsed; layout grid rigido nel panel |
| **Standardizzato** | `ReportLayoutMainAside` / `ReportLayoutSplit` data-driven |

---

## Clienti (`/report/clienti`)

| | |
|---|---|
| **Cosa c'era** | `ReportClientiSection` con shell + KPI + Pareto + lista in un blocco |
| **Accorpato** | KPI strip; Pareto con aside totale; confronto fatturato; lista drill-down |
| **Spostato** | Orchestrazione in area view; child esporta `ReportClientiKpiStrip`, `ParetoChart`, `DetailList` |
| **Eliminato** | `ReportAnalysisSectionShell` nel child |
| **Standardizzato** | `resolveChartLayout` per Pareto compact/wide, `buildReportDataInsight` |

---

## Trasversali (`/report/trasversali`)

| | |
|---|---|
| **Cosa c'era** | 4 sezioni cross con jargon UI ("Cross Trend", shell miste) |
| **Accorpato** | KPI → confronti domini → catena valore → andamento comparato → recap KPI |
| **Spostato** | Area view orchestra; child dumb (`ReportCrossMetricsKpiStrip`, `DomainComparisons`, …) |
| **Eliminato** | Titoli cross-domain/cross-trend in UI; card annidate per coppia metriche |
| **Standardizzato** | Copy `cross-*` da `report-copy.ts`; titoli che spiegano il confronto |

---

## Contesto (`/report/contesto`)

| | |
|---|---|
| **Cosa c'era** | Eventi + timeline con CTA "Apri timeline completa" e doppio shell |
| **Accorpato** | Eventi periodo + timeline inline immediata |
| **Spostato** | `ReportStorySection` in area view |
| **Eliminato** | Gate "Apri timeline"; `ReportAnalysisSectionShell` nei child |
| **Standardizzato** | `contesto-eventi` / `contesto-timeline` copy |

---

## Pattern duplicati globali — stato

| Pattern | Azione | Stato |
|---------|--------|-------|
| `ReportAnalysisSectionShell` in area views | Rimosso | ✅ |
| `ReportMetricEnvelopeCard` in area refactored | → `ReportAnalyticsKpi` | ✅ |
| `grid lg:grid-cols-2` automatico | → `ReportLayoutComposer` | ✅ |
| Copy tecnico in UI 6 aree | → `report-copy.ts` | ✅ |
| Child monolitici nelle 6 aree | → content exports | ✅ |

---

## Governance test

- `lib/regression/report-no-collapsible-areas.test.ts`
- `lib/regression/report-story-copy-coverage.test.ts`
- `lib/regression/report-area-orchestration.test.ts`
- `lib/regression/report-forbidden-ui-terms.test.ts`
- `lib/regression/report-analytics-ui-ssot.test.ts`
- `lib/regression/report-chart-colors-policy.test.ts`
