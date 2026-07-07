# Audit write path lavorazioni — matrice ruoli

Audit statico + policy test (2026-07). Verifica manuale su staging con utenti reali consigliata.

## Invariante

`admin`, `manager` e `operatore` devono avere **identico** accesso write su `lavorazioni` e `mezzi` (seed SSOT). Nessun branch ruolo-specifico nei componenti write.

## Matrice RBAC (seed / client guard)

| Ruolo | Can write lavorazioni | Can write mezzi | Route `/lavorazioni` | Classificazione |
|-------|----------------------|-----------------|----------------------|-----------------|
| admin | sì | sì | consentita | write atteso |
| manager | sì | sì | consentita | write atteso |
| operatore | sì | sì | consentita | write atteso |
| addetto_amministrativo | no | no | negata | **deny intenzionale** |
| guest | no | no | negata | **deny intenzionale** |
| cliente | no | no | negata (portale `lavorazioni_clienti` read) | **deny intenzionale** |

Test automatizzati: `lib/regression/lavorazioni-write-path-rbac-matrix.test.ts`, `security-rbac-policy.test.ts`.

## Matrice operazioni (write path SSOT)

| Operazione | Layer | Contratto |
|------------|-------|-----------|
| Create | `useLavorazioneCreateMutation` + `commitLavorazioneCreateSuccess` | MIC entity-scoped |
| Update stato/priorità | `useLavorazioneUpdateMutation` (istanza unica) | optimistic + `action: update` |
| Addetto | `await persistSchedeAndSync` | scheda RLS `lavorazioni` module |
| Archiviazione | `useLavorazioneConcludeMutation` | MIC + toast `action: update` |
| Elimina | `useLavorazioneRemoveMutation` | toast `action: delete` |

Policy: `minimal-invalidation-contract-policy.test.ts`, `lavorazioni-legacy-write-path-policy.test.ts`, `lavorazioni-write-error-surfacing.test.ts`.

## Errori UI

- Nessun `"Operazione fallita"` nel path lavorazioni.
- Fallback `"Operazione non riuscita"` solo in catena umanizzazione se messaggio grezzo assente.
- Tutti i toast write includono `{ module: "lavorazioni", action }`.

## Drift DB (da verificare su staging)

Script: [`scripts/audit-rbac-lavorazioni-drift.sql`](../scripts/audit-rbac-lavorazioni-drift.sql)

| Flag | Causa | Azione |
|------|-------|--------|
| `profile_role != rbac_role_for_user()` | Config DB | `security_set_user_role` |
| write role + `user_effective_can = false` | `role_page_access` / migration | re-seed migration |
| `user_page_overrides.lavorazioni = none` | Override utente | **deny intenzionale** |

## Checklist manuale (per ruolo)

### admin / manager / operatore

- [ ] Create ×5 consecutive senza toast errore
- [ ] Riga visibile in tabella post-create
- [ ] Cambio stato, priorità, addetto
- [ ] Archiviazione completata
- [ ] Messaggi errore (se forzato deny) con sezione Lavorazioni, non generico

### addetto_amministrativo / guest

- [ ] Pulsante create assente o disabilitato
- [ ] `ensurePageWrite` deny se forzato

## E2E multi-ruolo

`e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts` — blocchi `manager` / `operatore` se env:

- `SMOKE_MANAGER_EMAIL` / `SMOKE_MANAGER_PASSWORD`
- `SMOKE_OPERATORE_EMAIL` / `SMOKE_OPERATORE_PASSWORD`

## Fix applicati in questo audit

- Matrice test RBAC 6 ruoli + parity admin/manager/operatore
- SQL drift audit
- Policy legacy + error surfacing
- `action` su toast write residui (restore, schede, edit, sync ingresso)
- `fetchRbacRoleKeyForUser` su portale cliente server
- E2E smoke manager/operatore (opzionale)

## Esito

Write path **coerente per codice** su tutti i ruoli: stesso resolver RBAC, stessi hook, stessa invalidazione MIC. Differenze runtime attese solo per deny intenzionali o configurazione DB errata (non per ruolo nel codice UI).
