# Performance Agenda v5 — Metrics

**Date:** 2026-07-17

## Before (post-v3)

| Metrica | Stato |
|---------|-------|
| SSR sessions prefetch | Solo settings |
| Gantt/DnD/Sidebar | Eager in view chunk |
| Lista sessioni virtual | No |
| Modal form gate | `formOpen ?` inline |

## After (v5)

| Metrica | Stato |
|---------|-------|
| SSR sessions prefetch | BFF giorno corrente seeded |
| Gantt/DnD/Sidebar | `dynamic()` lazy panels |
| Lista sessioni virtual | `useVirtualizer` oltre 40 righe scrollable |
| Modal form gate | `GestionaleModalGate` |

## Verifica

```bash
npm run build
npx tsx lib/regression/agenda-perf-policy.test.ts
```
