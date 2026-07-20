# Audit & Redesign — Operational Intelligence Platform

Documento di audit end-to-end del sistema Analisi AI Report e piano di evoluzione verso **Operational Intelligence Platform (OIP)**.

**Data:** 2026-07-20  
**Stato:** Implementato (P0–P3)  
**ADR correlato:** [ADR-010-operational-intelligence-platform.md](./adr/ADR-010-operational-intelligence-platform.md)

---

## 1. Tesi di progetto

> **Non manca l'AI. Manca un livello decisionale sopra l'AI.**

La pipeline v2 era un **AI Explanation Layer** (spiega segnali insight). Il prodotto richiesto è un **Operational Decision Layer** (brief per il responsabile officina).

Valore = raccogliere segnali + interpretarli + priorizzarli + guidare decisioni — non generare testo AI generico.

---

## 2. Stato attuale (pre-OIP)

### 2.1 Due path AI

| Path | Flag | Output | Fit brief? |
|------|------|--------|------------|
| Legacy `POST /api/report/analysis` | `reportV2Narrative` OFF | Schema ricco + diario | Parziale |
| Narrative v2 `GET /api/report/narrative` | `reportV2Narrative` ON | `sections[]` per `ruleKey` | No |

### 2.2 Pipeline v2

```
Period → Datasets → Cross → Insights → AI Context → Narrative Prompt → Gemini
```

File chiave:

- [`lib/report/ai-context/build-report-ai-context-for-period.ts`](../lib/report/ai-context/build-report-ai-context-for-period.ts)
- [`lib/report/narrative/api/report-narrative-api.ts`](../lib/report/narrative/api/report-narrative-api.ts)
- [`components/report/layout/report-ai-analysis-zone.tsx`](../components/report/layout/report-ai-analysis-zone.tsx)

### 2.3 Intelligence parziale esistente

- 26 insight rules ([`lib/report/insights/rules/catalog.ts`](../lib/report/insights/rules/catalog.ts))
- Executive API ([`lib/report/executive/`](../lib/report/executive/))
- Cross-analysis ([`lib/report/cross-analysis/`](../lib/report/cross-analysis/))
- Health Score dashboard ([`lib/dashboard/operational-health-score.ts`](../lib/dashboard/operational-health-score.ts)) — **non** usato per il brief

### 2.4 Diario operativo

- Tabella `operational_diary_entries` ([migration](../supabase/migrations/20260910154000_operational_diary_entries.sql))
- Legacy AI: incluso via client (`useOperationalDiaryQuery`)
- Narrative v2: **escluso** (regressione P-02)

### 2.5 Provider AI

- SSOT: [`lib/ai/runtime/service.ts`](../lib/ai/runtime/service.ts)
- Gemini via `aiService.generateObject`
- ADR: [ADR-008](./adr/ADR-008-ai-runtime-manager.md)

---

## 3. Problemi identificati (P-01 … P-19)

| ID | Problema | Gravità | Fix |
|----|----------|---------|-----|
| P-01 | Dual path; v2 default ma non è un brief | Alta | OIP |
| P-02 | Diario escluso da v2 | Alta | P0 server-side diary |
| P-03 | Compliance signals non popolati | Alta | P0 compliance counts |
| P-04 | UI mostra `ruleKey` raw | Media | P0 human labels |
| P-05 | Errori rigenerazione nascosti | Media | P0 error visibility |
| P-06 | Insight catalog count drift | Media | CI gate (già fixato) |
| P-07 | Chiavi AI runtime SSOT | Media | ADR-008 + regression test |
| P-08 | Nessuno storico brief | Media | P2 storage |
| P-11 | Nessun OperationalPeriod | Alta | P1 |
| P-12 | Nessun Operational Brief Score | Alta | P1 |
| P-13 | Diario non classificato | Alta | P1 heuristic / P2 DB |
| P-14 | Salto DB → AI | Alta | 4 layer |
| P-15 | Nessun OperationalEvent | Media | P1 |
| P-16 | Output AI troppo libero | Media | Schema strutturato |
| P-17 | Nessun confidence + evidence | Media | P1 schema |
| P-18 | UI senza vista 20s | Media | Vista Direttore |
| P-19 | Nessuna modalità Direttore/Analista | Media | P1 UI |

---

## 4. Architettura target — 4 layer

```
DATABASE
    ↓
FACT ENGINE (KPI certi, delta, trend)
    ↓
INSIGHT ENGINE (26 rules + compliance)
    ↓
BRIEF CONTEXT (period, score, events, diary)
    ↓
AI LAYER (solo narrativa — "perché?", non "cosa?")
```

Implementazione: [`lib/operational-intelligence/`](../lib/operational-intelligence/)

**Regola d'oro:** l'AI riceve status + reasons già calcolati e spiega — non inventa lo stato.

---

## 5. Modelli dominio

### 5.1 OperationalPeriod

[`lib/operational-intelligence/period/types.ts`](../lib/operational-intelligence/period/types.ts)

Entità settimana/mese con `previousPeriodId` per confronto e storico.

### 5.2 Operational Brief Score

[`lib/operational-intelligence/score/build-operational-brief-score.ts`](../lib/operational-intelligence/score/build-operational-brief-score.ts)

Score deterministico 0–100 con domini: Produzione, Affidabilità, Magazzino, Personale, Costi.

Distinto da Health Score dashboard.

### 5.3 OperationalEvent

[`lib/operational-intelligence/events/build-operational-events.ts`](../lib/operational-intelligence/events/build-operational-events.ts)

`anomaly | improvement | risk | opportunity` con impact e evidence.

### 5.4 Diario classificato

P1: classificatore heuristic su testo esistente.  
P2: colonne DB `category`, `severity`, `related_entity_type`, `related_entity_id`.

### 5.5 Confidence + Evidence

Ogni statement: `{ statement, confidence, evidence[] }`.

---

## 6. API

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/report/operational-brief` | Genera brief operativo |
| `GET /api/report/operational-brief/history` | Storico brief salvati |
| `GET /api/report/operational-brief/pdf` | Export testo strutturato |
| `POST /api/report/operational-assistant` | Q&A su brief (P3) |

Flag: `operationalBriefEnabled` (default ON).

---

## 7. UI

- **Vista Direttore** (default): stato, contatori, priorità oggi — lettura 20 secondi
- **Vista Analista**: evidence, trend, drill-down

Componenti: [`components/report/operational-brief/`](../components/report/operational-brief/)

---

## 8. Roadmap implementata

| Fase | Contenuto |
|------|-----------|
| P0 | Regressioni: diary v2, compliance, labels, errori |
| P1 | OperationalBriefEngine + API + UI |
| P2 | Storico, periodi DB, diary classification, PDF |
| P3 | Assistente Q&A |

---

## 9. Riferimenti

- [report-v2-blueprint.md](./report-v2-blueprint.md)
- [report-v2-public-contracts.md](./report-v2-public-contracts.md)
- [ADR-008 AI Runtime](./adr/ADR-008-ai-runtime-manager.md)
- [ADR-010 OIP](./adr/ADR-010-operational-intelligence-platform.md)
