# Rollback checklist

Usare quando il post-deploy rivela un **FAIL critico** non risolvibile rapidamente.

## Quando fare rollback

- [ ] Login impossibile per tutti gli utenti
- [ ] Hydration mismatch persistente su route core
- [ ] RBAC completamente rotto (accesso negato errato su massa)
- [ ] Errori build/runtime che bloccano l'uso operativo
- [ ] Regressioni confermate su dashboard/report

## Quando NON fare rollback (solo fix dati / config)

- [ ] Problema isolato a un utente → correggere `user_permissions` / `profiles`
- [ ] Documento singolo non apre → verificare signed URL / path storage
- [ ] Realtime down temporaneo → polling fallback attivo (degradazione accettabile)
- [ ] Spike invalidation post-login → auto-recovery attesa
- [ ] Dati corrotti in DB → fix SQL, non rollback app

## Procedura Vercel instant rollback

1. [ ] Vercel Dashboard → Deployments → production
2. [ ] Selezionare **deployment precedente** con `release-gate` verde
3. [ ] Promote / Rollback to this deployment
4. [ ] Verificare SHA rollback = ultimo commit stabile noto
5. [ ] Attendere propagazione CDN (1–3 min)

## Post-rollback verification

- [ ] Login admin OK
- [ ] Dashboard + report OK
- [ ] Nessun errore hydration in console
- [ ] Comunicare al team SHA rollbackato e motivo

## Git follow-up

- [ ] Identificare commit regressivo su `main`
- [ ] Aprire PR revert o fix forward
- [ ] **Non** force-push su `main`
- [ ] `release-gate` deve essere verde prima del prossimo deploy

## Supabase / dati

- [ ] Rollback app **non** ripristina dati DB
- [ ] Se migration già applicata: valutare rollback SQL manuale (vedi backup pre-deploy)
- [ ] Storage objects non eliminati dal rollback Vercel

## Comunicazione

- [ ] Notificare utenti pilot del rollback e stato servizio
- [ ] Documentare incidente (data, SHA bad, SHA good, sintomo)
- [ ] Se necessario: [incident-checklist.md](./incident-checklist.md)

## Riferimenti

- [post-deploy-checklist.md](./post-deploy-checklist.md)
- [pre-deploy-checklist.md](./pre-deploy-checklist.md)
