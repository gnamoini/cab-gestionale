# Lavorazioni Kanban — Performance RCA

**Data:** 2026-07-18  
**Route:** `/lavorazioni`  
**Tipo intervento:** performance hygiene / isolation governance (non refactor strutturale)

---

## Problema

Sospetto che la vista Kanban (usata raramente, <2 volte/giorno) introduca costi permanenti sul percorso quotidiano della pagina Lavorazioni: bundle, listener, query anticipate, rendering React.

---

## Verdetto

**Kanban non è il responsabile del caricamento lento principale su `/lavorazioni`.**

| Area | Esito audit |
|------|-------------|
| Code splitting Kanban UI | Già corretto (`dynamic()` + `ssr: false`) |
| `@dnd-kit` al boot tabella | Già assente dal percorso iniziale |
| Query Kanban dedicate | Non esistono |
| Query lavorazioni/schede/mezzi al boot | Condivise con tabella — **necessarie**, non costo Kanban |

Il miglioramento consiste nel **completare l'isolamento** eliminando micro-leak architetturali nel percorso tabella.

**Non implementato (volutamente):** separazione query, duplicazione dataset, secondo data layer Kanban.

---

## Root cause residua (pre-fix)

```
/lavorazioni (tabella)
  ├── useLavorazioniList + schede + mezzi     ← necessario tabella
  ├── useKanbanViewportLayout()               ← LEAK: matchMedia sempre attivo
  ├── LoadingKanbanSkeleton import statico    ← LEAK: bundle parent
  └── useUIAutonomyFixEngine("/lavorazioni:kanban") condizionale ← LEAK: context tabella
```

Chunk Kanban (`lavorazioni-kanban-view`) e `@dnd-kit` erano già caricati **solo** al click "Vista Kanban".

---

## Timeline costi

### Percorso quotidiano (tabella)

```
GET /lavorazioni
  → prefetch settings + lavorazioni attive + mezzi + schede
  → LavorazioniViewLazy
  → tabella + toolbar
  → [pre-fix] matchMedia listener Kanban
  → [post-fix] nessun riferimento Kanban
```

### Apertura Kanban (raro)

```
Menu → Vista Kanban
  → dynamic import lavorazioni-kanban-lazy (skeleton + view)
  → useKanbanViewportLayout + useUIAutonomyFixEngine("/lavorazioni:kanban")
  → mobile: board senza DnD
  → desktop: LavorazioniKanbanDesktopBoardLazy → @dnd-kit
```

---

## Soluzione implementata

### P0 — Isolation hygiene

| Fix | File |
|-----|------|
| `useKanbanViewportLayout` spostato nel dominio Kanban | `lavorazioni-kanban-view.tsx` |
| Rimosso `LoadingKanbanSkeleton` dal parent | `lavorazioni-view.tsx` → barrel `lavorazioni-kanban-lazy.tsx` |
| `useUIAutonomyFixEngine("/lavorazioni:kanban")` solo in Kanban | `lavorazioni-kanban-view.tsx` |
| Parent autonomy solo `/lavorazioni` | `lavorazioni-view.tsx` |

### P1 — DnD desktop lazy

| Fix | File |
|-----|------|
| Desktop board + `@dnd-kit` in chunk separato | `lavorazioni-kanban-desktop-board.tsx` |
| Lazy panel desktop | `lavorazioni-kanban-lazy-panels.tsx` |
| Mobile Kanban non importa `lavorazioni-kanban-dnd` | `lavorazioni-kanban-view.tsx` |

### Governance

| Artefatto | Path |
|-----------|------|
| `KANBAN_ISOLATION_POLICY` | `lib/regression/lavorazioni-kanban-perf-policy.test.ts` |
| E2E chunk/network guard | `e2e/smoke/lavorazioni-kanban-lazy.spec.ts` |

---

## Metriche

### Bundle (KB — impatto minimo atteso)

| Metrica | Prima | Dopo | Target |
|---------|-------|------|--------|
| First-load JS `/lavorazioni` | ~1763 KB | ~1763 KB | non peggiorare |
| Chunk kanban al boot | 0 | 0 | 0 |
| `@dnd-kit` al boot | 0 | 0 | 0 |

Fonte baseline: `test-results/build-budget-snapshot.json`, `test-results/lavorazioni-kanban-perf-before.json`.

### Runtime (guadagno principale)

| Metrica | Prima | Dopo | Target |
|---------|-------|------|--------|
| `matchMedia` listener Kanban in tabella | 1 | 0 | 0 |
| Import statico Kanban nel parent | sì | no | no |
| Context `/lavorazioni:kanban` in tabella | condizionale | no | no |
| Re-render tabella su resize viewport | possibile | no | 0 |
| Network chunk `lavorazioni-kanban` in tabella | 0 | 0 | 0 |
| Query Kanban-specifiche | 0 | 0 | 0 |

Artifact: `test-results/lavorazioni-kanban-perf-after.json`.

### React Profiler (target audit)

In modalità tabella:

- nessun commit causato da componenti Kanban
- nessun update context `/lavorazioni:kanban`
- listener `matchMedia` Kanban assente

---

## Conferma esplicita

> Aprendo `/lavorazioni` in modalità tabella, **nessun codice specifico Kanban** viene caricato. Le query lavorazioni, schede e mezzi restano condivise perché alimentano la tabella principale e **non rappresentano un costo Kanban**.

(Tecnicamente non esiste una "query Kanban".)

---

## Verifica

```bash
npx tsx lib/regression/lavorazioni-kanban-perf-policy.test.ts
npx playwright test e2e/smoke/lavorazioni-kanban-lazy.spec.ts
```

---

## Rischi residui

| Rischio | Mitigazione |
|---------|-------------|
| Flash skeleton al primo switch Kanban | `LoadingKanbanSkeleton` nel barrel lazy |
| Latency primo drag desktop | Chunk DnD piccolo; feature rara |
| Nome file chunk fragile in E2E | Pattern `lavorazioni-kanban`, non hash |

---

## Valutazione

| Aspetto | Score |
|---------|-------|
| Architettura | 9/10 |
| Diagnosi RCA | 9/10 |
| Rischio regressione | Basso |
| Beneficio atteso | Medio-basso ma permanente |
