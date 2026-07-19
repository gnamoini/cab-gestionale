# Performance Memory Baseline (Sprint 0)

## Protocollo heap + React Query

```
T0: hard refresh /dashboard
T1: → /lavorazioni
T2: → /magazzino
T3: → /dashboard (+30s idle)
```

## Script

```bash
NEXT_PUBLIC_BENCH_EXPOSE_QUERY=1 npm run bench:memory
```

Output: `test-results/memory-regression-benchmark.json`

## Target

| Metrica | Target |
| ------- | ------ |
| Δ heap T0→T3 | <30 MB |
| Detached DOM | <50 |
| RQ cache serialized | WARN >10 MB, FAIL >30 MB |

## Scenario critico documentato

```
lavorazioni 2000 righe + magazzino 5000 articoli
→ decine MB in React Query se gcTime lungo
```

Verificare: query obsolete, duplicati `lavorazioniQueries` full + list-v2.

## Baseline pre-fix

Eseguire script su staging-small prima del merge Sprint 1.
