# Performance v5 — Program SSOT

**Date:** 2026-07-17  
**Scope:** 12 pagine gestionale — interventi page-local only

## Artefatti per pagina

| Artefatto | Pattern |
|-----------|---------|
| Metriche | `docs/performance-{slug}-v5-metrics.md` |
| Implementazioni | `docs/performance-{slug}-v5-implementations.md` |
| Policy | `lib/regression/{slug}-perf-policy.test.ts` |

## Baseline

```bash
npm run ops:performance-snapshot
NEXT_PUBLIC_RENDER_AUDIT=1 npm run dev
```

## Guardrail (ogni wave)

```bash
npm run build
npx tsx lib/regression/{slug}-perf-policy.test.ts
npx tsx lib/regression/performance-policy.test.ts
npx tsx lib/regression/shared-components-perf-policy.test.ts
```

## Ordine

Agenda → Lavorazioni → Magazzino → Impostazioni → Portale → Preventivi → Dipendenti → Mezzi → Report → Dashboard → Fatturazione → Sicurezza
