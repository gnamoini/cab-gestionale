# Checklist performance — nuova feature

Applicare a ogni PR che introduce UI, dati o bundle nuovi.

## Bundle e caricamento

- [ ] La feature usa `dynamic()` / lazy loading per modali e sezioni pesanti?
- [ ] Il bundle post-build resta sotto `maxFirstLoadJsKb` della route?
- [ ] Nessun import statico di PDF/AI/chart library in shell o view eager?

## Dati e rete

- [ ] Nuove query hanno scope key e budget in registry se cold-load?
- [ ] Nessun `select('*')` nei services?
- [ ] Query duplicate evitate (React Query key stabile)?
- [ ] Payload REST sotto `maxPayloadKb`?

## Rendering

- [ ] Liste >100 righe usano virtualizzazione?
- [ ] Modali/drawer usano `GestionaleModalGate` quando chiusi?
- [ ] Nessun `ssr:false` su view con prefetch SSR?
- [ ] Può essere Server Component invece di Client Component?

## Stato e memoria

- [ ] Nuovi provider/context necessari? (minimizzare)
- [ ] Listener/timer/subscription con cleanup on unmount?
- [ ] Cache invalidation mirata (non global flush)?

## Realtime

- [ ] Nuove subscription sotto `MAX_REALTIME_CHANNELS`?

## Governance

- [ ] `npx tsx lib/regression/<page>-perf-policy.test.ts` passa?
- [ ] Se supera budget: label `perf-budget-exception` + motivazione?
- [ ] Documentazione aggiornata se nuova route in registry?

## Verifica locale

```bash
npm run build
npm run ops:build-budget-gate
npx tsx lib/regression/performance-policy.test.ts
```
