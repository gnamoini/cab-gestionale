# FASE 0 — Audit CAB (pre-integrazione UnoERP)

Data: 2026-09-03. Nessuna modifica di comportamento CAB in questa fase.

## Schema

### Preventivi / Consuntivi

- Tabella unica `public.preventivi`. Discriminazione: `dettagli->>'tipoDocumento'` (`preventivo` | `consuntivo`).
- Righe in JSONB `dettagli` (`righeRicambi`, `manodopera.righeAddetti`). Nessuna tabella `consuntivi` / `righe_preventivi`.
- Colonna `versione` (int). Tipi: `lib/preventivi/types.ts` (`PreventivoRecord`).
- Numerazione: `preventivi_lavorazione_numero_counters`, `preventivi_manuali_numero_counters`.

### DDT

- `ddt_documents` + `ddt_rows` + `ddt_links` (`supabase/migrations/20260720120000_ddt_module.sql`).
- Numero assegnato su `confirm_ddt()` via `assign_ddt_numero(anno, serie)` con `pg_advisory_xact_lock`.
- Unique `(anno, serie, numero)` se non annullato.
- Stati: bozza / confermato / stampato / consegnato / annullato.

### Clienti

- `clienti_anagrafiche`: `partita_iva`, `entity_key` (interno CAB), `ragione_sociale`, `codice_destinatario`.
- `codice_fiscale` non first-class (solo `meta` JSONB o `billing_customers`).
- Sedi: `clienti_sedi`. PEC: `clienti_contatti.tipo = pec`.

## Punti di ingresso mutation

| Documento | File | Meccanismo |
|---|---|---|
| Preventivo/Consuntivo | `src/services/preventivi.service.ts` via `lib/domain/preventivi-entry.ts` | insert/update client-side Supabase |
| DDT | `src/services/ddt.service.ts` via `lib/domain/ddt-entry.ts` | RPC `create_ddt_with_rows`, `confirm_ddt`, `cancel_ddt` |

Implicazione: UnoERP non può essere chiamato dal browser. Hook: domain entry → API server → outbox.

Nessun autosave. `src/actions/` non gestisce CRUD documenti.

## PDF (non input sync)

- Preventivo/Consuntivo: `lib/preventivi/preventivo-pdf-generate.ts`
- DDT: `lib/ddt/ddt-pdf-generate.ts`
- Artifact: `lib/pdf-artifacts/pdf-artifact-generate.server.ts`

## Pattern riutilizzabili

- Outbox: `notification_outbox` (claim/complete/release).
- Env server-only: `lib/env/`.
- Cron: `app/api/cron/` + `CRON_SECRET` / service role.

## Rischi

- Mapping preventivo/consuntivo CAB condiviso vs moduli UnoERP distinti.
- `entity_key` non è ID UnoERP.
- `codice_fiscale` assente su anagrafica operativa.
- Numerazione DDT CAB su confirm: UnoERP deve accettare o CAB deve ritardare — da discovery.
- Nessun codice UnoERP preesistente.

## Proposta

Snapshot versionato (`updated_at` / `versione`) → `unoerp_sync_jobs` → worker server-only → CREATE/UPDATE → SHOW read-back → SYNCED. Writes bloccate finché discovery + gate PASS.
