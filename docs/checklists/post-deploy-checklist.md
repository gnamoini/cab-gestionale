# Post-deploy checklist

Eseguire **entro 30 minuti** dal deploy production su Vercel.

## Verifica deploy

- [ ] SHA deployato Vercel = commit `main` con check `release-gate` verde
- [ ] Nessun redeploy manuale su commit diverso
- [ ] Build Vercel completata senza errori

## Smoke manuale production

- [ ] Login admin funzionante
- [ ] Dashboard carica (no spinner infinito)
- [ ] Report carica dati
- [ ] Navigazione moduli principali (lavorazioni, magazzino, documenti)
- [ ] Apertura documento via signed URL (bucket privato)
- [ ] Logout / re-login

## Mobile (spot check)

- [ ] Nessuno scroll orizzontale su viewport mobile
- [ ] Drawer nav apre e chiude
- [ ] Modale/drawer rilascia scroll-lock alla chiusura

## RBAC spot check

- [ ] Admin accede a `/sicurezza`
- [ ] Operatore **non** accede a sezioni admin (se utente test disponibile)
- [ ] Guest reindirizzato a login

## Observability (se necessario)

- [ ] Abilitare temporaneamente `NEXT_PUBLIC_CAB_OPS_WARN=1` su Vercel (solo indagine)
- [ ] Console browser: nessun `runtime.hydration.mismatch`
- [ ] Nessun `ops.degradation.invalidation_storm` ripetuto
- [ ] Disabilitare `CAB_OPS_WARN` dopo indagine

## Production readiness dashboard

- [ ] `/sicurezza/production-readiness` — nessun blocker
- [ ] Security Release Control — READY (informativo, non blocca deploy)

## Database performance (linked Supabase CLI)

- [ ] `npm run ops:slow-query-audit` — confronta `test-results/slow-query-audit.json` con baseline
- [ ] Nessuna regressione >10% su execution time EXPLAIN vs `slow-query-audit-baseline.json`
- [ ] `npm run ops:performance-regression-check` — exit 0 (no FAIL >20% vs `performance-snapshot-baseline.json`)
- [ ] Opzionale dettaglio: `npm run ops:db-explain`, `npm run ops:rest-benchmark`, `npm run ops:performance-snapshot`

## Storage monitoring

- [ ] Upload documento test (opzionale, ambiente non critico)
- [ ] Se orphan sospetti: `npm run ops:diagnostics` con service role locale

## Escalation

| Esito | Azione |
|-------|--------|
| FAIL critico (login, hydration, RBAC) | [Rollback checklist](./rollback-checklist.md) |
| Degradazione (report lento, polling) | [Incident checklist](./incident-checklist.md) |
| Tutto OK | Completare rollout fase successiva in [rollout-checklist.md](./rollout-checklist.md) |

## Riferimenti

- [observability-ops.md](../observability-ops.md)
- [incident-checklist.md](./incident-checklist.md)
