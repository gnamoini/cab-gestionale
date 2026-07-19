# Profiler Ranked Chart — Post-v3 (manual capture)

**Istruzioni:** `NEXT_PUBLIC_PERF_DIAGNOSTICS=1` + React DevTools Profiler su **prod build** (`npm run build && npm run start`).

Per ogni scenario: Record → azione → Stop → esportare commit duration e top 5 componenti.

## Scenari

### 1. Lavorazioni — filtro avanzato

| Rank | Component | Commit ms | % of total |
| ---- | --------- | --------: | ---------: |
| 1 | LavorazioniView | _fill_ | _fill_ |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

**State split GO/NO-GO:** LavorazioniView >50% → GO

### 2. Lavorazioni — ricerca post-debounce

| Rank | Component | Commit ms | % of total |
| ---- | --------- | --------: | ---------: |
| 1 | | | |

### 3. Lavorazioni — kanban drag (se kanban mode)

| Rank | Component | Commit ms | % of total |
| ---- | --------- | --------: | ---------: |
| 1 | | | |

### 4. Magazzino — search keystroke

| Rank | Component | Commit ms | % of total |
| ---- | --------- | --------: | ---------: |
| 1 | | | |

### 5. Dashboard — toggle widget

| Rank | Component | Commit ms | % of total |
| ---- | --------- | --------: | ---------: |
| 1 | | | |

## Decisione state split

- [x] **NO-GO** — prod `/lavorazioni` TTI 1054 ms (Pass <2500); refactor non giustificato senza Profiler ranked che mostri LavorazioniView >50% su filtro
- [ ] GO — solo se ranked chart dimostra commit dominante su LavorazioniView

**Motivo:** decision gate post-v3 — vedi `docs/performance/post-v3-results.md`
