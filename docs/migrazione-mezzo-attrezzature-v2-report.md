# Migrazione Mezzo + Attrezzature V2 — Report

## A. Aree analizzate

- **Read path**: liste mezzi (`fetchMezziGestitiListRows`), liste lavorazioni (`fetchLavorazioniListRows` + enrich attrezzature), intervento-context (list row + fetch server), report BFF, documenti dashboard
- **Write path**: hub mezzi, scheda ingresso, import CSV mezzi, servizi mezzi/attrezzature
- **UI**: lavorazioni (Oggetto), edit modal, filtri, PDF export, notifiche create/completate
- **Magazzino**: `useGlobalOptions`, `useGlobalListOptions`, ricambio-compat-resolver
- **RBAC**: route matrix test; RLS attrezzature eredita modulo mezzi
- **Production gates**: `production:check`, attrezzature-v2-production-gate, mezzi-payload-v2-guard

## B. Problemi risolti (hardening)

| Problema | Causa | Soluzione | Impatto |
|----------|-------|-----------|---------|
| Lavorazioni list embed vuoto | `MEZZI_LIST_EMBED_COLUMNS` telaio-only | `enrichLavorazioniListRowsWithAttrezzature` post-fetch | Colonna Oggetto, filtri, edit, audit log popolati |
| Multi-attrezzatura ignorata | Solo `pickPrimaryAttrezzatura` | `pickAttrezzaturaForContext` SSOT | Target lavorazione rispetta `attrezzatura_id` |
| Intervento context synthetic | Embed slim + costruzione fake row | Enrich list + `attrezzaturaRowFromEnrichedMezzo`; fetch reale in `fetchInterventoContextInputs` | Display/PDF/notifiche coerenti |
| Import mezzi perde attrezzatura | Insert solo tabella `mezzi` | `upsertAttrezzaturaForMezzoImport` + compensating delete on failure | Dati attrezzatura persistiti |
| Catalog marche disallineato | Fleet merge solo in `useGlobalOptions` | `resolveMezziListeWithFleetCatalog` anche in `useGlobalListOptions` | Select ricambi/magazzino allineate alla flotta |
| Dead code V1 | Provider/hook/merge legacy | Rimossi provider, file merge/payload, telemetry v1 | Manutenzione semplificata |
| Payload legacy mezzi | Opt-in strip | `sanitizeMezzoWritePayload` sempre strip colonne attrezzatura | Write path V2-only |

## C. Problemi non risolti (pre-R4)

- **R4 SQL** non eseguito su DB prod — gate `--r4-ready` obbligatorio prima del drop
- **RBAC smoke manuale** 3 profili consigliato pre-promozione (matrice automatica verde)

## E. Release readiness

### Build / qualità

| Gate | Stato |
|------|-------|
| `npm run build` | PASS |
| `npx tsc --noEmit` | parziale — errori residui fuori area V2 (vedi ci:tsc) |
| `npm run lint` | FAIL globale (375 errori pre-esistenti fuori area V2); nessun nuovo errore bloccante nei file migrati |
| `npm run production:check` | PASS |

Fix applicato: `calendar-v2-grid` `aria-pressed` boolean.

### Database / R4

- Script unificato: `npm run audit:release-v2-db` (`--strict`, `--r4-ready`, `--json`)
- Migration R4: `supabase/migrations/manual/20260801120500_drop_mezzi_legacy_attrezzatura.sql` — **irreversibile**
- Companion post-R4: `supabase/migrations/manual/20260801120650_r4_drop_legacy_guard.sql`
- Rollback R4: **solo restore backup** + deploy app precedente; env `NEXT_PUBLIC_MEZZO_ATTREZZATURE_V2=0` per emergenza pre-R4

### Adapter SSOT

- `mezzoGestitoFromRow` unico adapter pubblico; `toMezzoUI` deprecato (wrapper)
- Call site migrati: intervento-context, lavorazioni labels, documenti slice, batch enrich

### Import

- Preview dedup: targa su `mezzi` + matricola su `attrezzature` (fallback legacy `mezzi.matricola` pre-R4)

### RBAC

| Ruolo | Mezzi route | Mezzi module |
|-------|-------------|--------------|
| admin | sì | read+write |
| operatore | sì | read+write |
| addetto_amministrativo | no | no access |

RLS attrezzature: scope via `mezzi.cliente`; policy write = modulo mezzi.

### Test obbligatori

```bash
npx tsx lib/domain/mezzo-attrezzatura/mezzo-gestito-adapter.test.ts
npx tsx lib/regression/attrezzature-rbac-smoke.test.ts
npx tsx lib/lavorazioni/lavorazione-documenti-slice.test.ts
npx tsx lib/data-import/entities/mezzi/mezzi-import-dedup-preview.test.ts
npx tsx lib/regression/audit-release-v2-db.test.ts
npx tsx lib/regression/permissions-role-matrix.test.ts
npx tsx lib/regression/attrezzature-v2-production-gate.test.ts
```

### Residui

**Bloccanti produzione (pre-R4):**

- Esecuzione gate `audit:release-v2-db --strict --r4-ready` su DB staging/prod
- Soak + backup verificato prima R4

**Non bloccanti:**

- `toMezzoUI` wrapper deprecato (rimuovere quando grep call site = 0)
- Flag DB `app_settings.system.mezzo_attrezzature_v2` fino a fine soak

**Debito tecnico:**

- Hierarchy prefs per ricambi orfani
- Primary attrezzatura su liste senza `attrezzatura_id`
- Param `v2Enabled` in `sanitizeMezzoWritePayload` (solo test legacy opt-out)

### Rollback vs modello unico

| Elemento | Mantieni | Rimuovi post-R4 |
|----------|---------|-----------------|
| `NEXT_PUBLIC_MEZZO_ATTREZZATURE_V2=0` | emergenza | opzionale |
| Flag DB soak | sì | sì |
| Settings UI toggle V2 | — | rimosso |
| `attrezzature-v2-context.ts` | — | rimosso (inline flag) |
| Dual runtime branch | — | mai esistito post-hardening |

## D. Debito tecnico inevitabile

- Hierarchy prefs restano fallback per ricambi orfani (`ponytail:` in `attrezzature-catalog.ts`)
- Liste mezzo-only senza contesto lavorazione usano attrezzatura **primary** (`created_at`)
- Env `NEXT_PUBLIC_MEZZO_ATTREZZATURE_V2=0` per rollback emergenza (documentato in report §E)
- Campi opzionali embed su `MezzoRow` / tipo `MezzoEmbedRow` per join compositi

## Verifiche eseguite

- `pickAttrezzaturaForContext`, batch enrich, import payload, catalog merge — test dedicati
- `attrezzature-v2-production-gate`, `mezzi-payload-v2-guard`, `invalidate-targets` (chiave `attrezzature`)
- Allowlist production scan aggiornata per import/intervento-context

## Script pre-deploy

- `npm run audit:release-v2-db -- --strict` — audit DB + codice
- `npm run audit:release-v2-db -- --strict --r4-ready` — gate bloccante pre-R4
- `npx tsx scripts/audit-mezzo-v2-baseline.ts` — mezzi senza attrezzatura = 0
- `npx tsx scripts/audit-ricambi-compat-v2.ts` — compat ricambi post-V2
