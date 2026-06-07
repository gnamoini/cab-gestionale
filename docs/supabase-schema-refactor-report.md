# Report refactor schema Supabase — gestionale-cab

> **SSOT aggiornato:** questo documento è storico (maggio 2026, ~38 migration).  
> Per l'audit production-grade completo (80 migration, snapshot DB live, score readiness):  
> **[audit-supabase-ecosystem.md](./audit-supabase-ecosystem.md)**

**Data analisi:** 2026-05-22  
**Migrations analizzate:** 38 file in `supabase/migrations/` + `supabase/rbac_core.sql`  
**Obiettivo:** schema minimale, RLS coerente, zero downtime, compatibilità frontend totale.

---

## Fase 1 — Analisi completa

### 1.1 Tabelle (stato finale atteso)

| Tabella | Uso frontend / backend | Realtime publication |
|---------|------------------------|----------------------|
| `profiles` | Auth, RBAC, middleware, sicurezza | — |
| `mezzi` | `mezzi.service`, join lavorazioni | ✅ |
| `lavorazioni` | `lavorazioni.service`, portale clienti | ✅ |
| `scheda_lavorazione` | `schede.service` | ✅ |
| `magazzino_ricambi` | `magazzino.service` | ✅ |
| `movimenti_ricambi` | `movimenti.service` | ✅ |
| `preventivi` | `preventivi.service` | ✅ |
| `documenti` | `documenti.service` (catalogo) | ✅ |
| `log_modifiche` | `log.service`, audit | ✅ |
| `app_settings` | `settings.service`, stati/priorità dinamici | — |
| `app_settings_audit` | `app-settings-audit.service` (admin) | — |
| `user_permissions` | `admin-users`, override granulari | — |
| `auth_logs` | `auth-logs.service`, dashboard sicurezza | ✅ |
| `support_notes` | **DEPRECATED** — modulo Supporto rimosso; SELECT admin only (`20260704130000`) | ⚠️ |
| `lavorazione_documents` | PDF lavorazione `lavorazione-documents.service` | ✅ |
| `segnalazioni` | **DEPRECATED** — modulo Supporto rimosso; SELECT admin only | ⚠️ (drop pianificato) |

**View:** `lavorazioni_clienti` (security invoker) — non usata direttamente dal client TS (query su `lavorazioni` + RLS).

**RPC attive:** `bulk_upsert_app_settings`, `soft_delete_lavorazione`, `archive_lavorazione_client_portal` (se presente).

### 1.2 Enum / tipi

| Tipo | Stato |
|------|--------|
| `ruolo_utente` | **Attivo** — valori: `admin`, `manager`, `operatore`, `cliente`, `guest` + legacy in DB (`ospite`, `magazziniere`, …) normalizzati da `rbac_normalize_role()` |
| `tipo_scheda_lavorazione`, `tipo_movimento_ricambio`, `categoria_documento` | Attivi |
| `stato_lavorazione`, `priorita_lavorazione` | **Rimossi** (20260520120000) — colonne `TEXT` |
| `ruolo_profile` | **Rimosso** |

### 1.3 Funzioni — usate vs legacy

#### Single source of truth (mantenere)

Definite in `supabase/rbac_core.sql`, applicate da `20260519150100` + fix `20260521120000`:

- **Spina dorsale:** `rbac_has_capability`, `rbac_role_for_user`, `rbac_role`, `rbac_can_read_row`, `rbac_can_read_log`, `rbac_scope_cliente*`
- **Wrapper policy:** `rbac_can_read_operational`, `rbac_can_write_operational`, `rbac_can_read/write/delete(text)`
- **Storage / cliente:** `rbac_can_read_storage`, `rbac_lavorazione_visible_to_cliente`, …
- **Utility:** `set_updated_at`, `handle_new_user`, `log_app_settings_update_audit`, `bulk_upsert_app_settings`, `soft_delete_lavorazione`

#### Probabilmente legacy (candidati deprecazione)

| Funzione | Motivo | Azione migration |
|----------|--------|------------------|
| `rbac_resource_allows_read/write/delete` | Sostituite da `rbac_has_capability` in 50100; non in `rbac_core.sql` | **DROP IF EXISTS** (nessuna policy `cap_*` le usa) |
| `current_profile_role()` | Modello pre-capability; `cap_*` usa `rbac_*` | **Wrapper → `rbac_role()`** (compat, zero rottura) |
| `rbac_normalized_role()` | Alias di `rbac_role()` | Mantenere (documentato come alias) |
| `user_effective_can()` | Non usata da policy `cap_*`; ancora utile per `user_permissions` futuro | **Mantenere** |

### 1.4 RLS — modello effettivo (post-50100)

**Prefisso attivo:** `cap_<tabella>_<operazione>` su tabelle operative.

**Eccezioni intenzionali:**

- `auth_logs`: 1× SELECT (`cap_auth_logs_select`) + 4× INSERT (login/logout/failed)
- `lavorazione_documents`: prefisso `rbac_lavorazione_documents_*` (da allineare a `cap_*`)
- `storage.objects`: `cap_storage_*` + `rbac_storage_documenti_lavorazioni_cliente_select` (doppio SELECT **voluto** per PDF cliente)

**Generazioni storiche (dovrebbero essere assenti se migrations applicate in ordine):**

1. `*_select_role`, `*_insert_priv`, `cab_*` (storage)
2. `rbac_*` (191200)
3. `cap_*` (191501) — **corrente**

### 1.5 Duplicazioni rilevate

| Area | Duplicazione | Rischio | Mitigazione |
|------|--------------|---------|-------------|
| RBAC SQL | `rbac_core.sql` ≈ blocco in `19150100` | Drift tra file e DB | Migration 22120000 riallinea wrapper; `rbac_core.sql` = riferimento repo |
| Policies | 38 migrations sovrapposte | Policy fantasma se migration parziale | Script `verify-schema-consolidation.sql` |
| Supporto | `segnalazioni` + `support_notes` | Doppia fonte dati | `support_notes` = SoT; `segnalazioni` read-only |
| Realtime frontend | `segnalazioni` + `support_notes` in config | Invalidazioni inutili | Fase 2 frontend (vedi §4) |
| Enum ruoli | Valori legacy in `ruolo_utente` | Nessun errore runtime | `rbac_normalize_role` già mappa |

### 1.6 Oggetti usati attivamente (frontend)

```
profiles, mezzi, lavorazioni, scheda_lavorazione,
magazzino_ricambi, movimenti_ricambi, preventivi, documenti,
log_modifiche, app_settings, app_settings_audit, user_permissions,
auth_logs, support_notes, lavorazione_documents
```

**RPC:** `bulk_upsert_app_settings`, `soft_delete_lavorazione`

### 1.7 Oggetti legacy (non eliminare subito)

- Tabella `public.segnalazioni` (+ policy `cap_segnalazioni_*`)
- `src/services/segnalazioni.service.ts`
- Realtime / `QK.segnalazioni` / `cab-sync-bus` entry `segnalazioni`

### 1.8 Rischi — NON toccare in produzione senza piano

| Oggetto | Motivo |
|---------|--------|
| `rbac_has_capability` + `rbac_can_read_row` | Tutte le policy `cap_*` |
| Policy `cap_lavorazioni_*` + `soft_delete_lavorazione` | Soft delete + portale clienti |
| `rbac_storage_documenti_lavorazioni_cliente_select` | PDF cliente su bucket `documenti` |
| `handle_new_user` + trigger profilo | Onboarding auth |
| `profiles.ruolo` tipo `ruolo_utente` | Colonna vincolata enum |
| `log_modifiche` senza policy UPDATE | Modello append-only |
| View `lavorazioni_clienti` | Dipendenze enum→text già migrate |
| Publication `supabase_realtime` | Bridge client React |

---

## Fase 2 — Normalizzazione architettura (target)

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (supabase-js)                                 │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  RLS cap_*  →  rbac_has_capability / rbac_can_read_row  │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  profiles.ruolo :: ruolo_utente → rbac_normalize_role   │
└─────────────────────────────────────────────────────────┘
```

**Regole:**

1. Una policy per `(tabella, operazione)` salvo eccezioni documentate (auth_logs INSERT, storage SELECT).
2. Tutte le nuove policy: prefisso `cap_`.
3. `supabase/rbac_core.sql` = documentazione eseguibile; ogni fix RBAC → prima `rbac_core.sql`, poi migration incrementale.
4. `segnalazioni` → fase deprecazione (read-only) → fase drop (solo dopo backup + verifica righe).

---

## Fase 3 — Migration sicura generata

**File:** `supabase/migrations/20260522120000_schema_consolidation_safe.sql`

Contenuto (solo incrementale):

1. `current_profile_role()` → wrapper di `rbac_role()` (elimina logica duplicata, mantiene compatibilità)
2. `DROP FUNCTION` orphan `rbac_resource_allows_*`
3. `segnalazioni` → commento DEPRECATED + revoca INSERT/UPDATE + drop policy scrittura
4. `lavorazione_documents` → rename policy `rbac_*` → `cap_lavorazione_documents_*` (stessa espressione)
5. Drop esplicito policy legacy note (`segnalazioni_*_role`) se ancora presenti
6. Commenti `COMMENT ON TABLE` per registry

**NON include:** DROP TABLE, DROP enum, squash migrations storiche.

---

## Fase 4 — Safety layer

Prima di ogni DROP in produzione eseguire:

```sql
-- Dipendenze funzione
SELECT pg_describe_object(refobjid) AS depends_on
FROM pg_depend
WHERE objid = 'public.rbac_resource_allows_read(text)'::regprocedure;

-- Policy duplicate per tabella/op
SELECT tablename, cmd, array_agg(policyname) AS policies
FROM pg_policies
WHERE schemaname IN ('public','storage')
GROUP BY tablename, cmd
HAVING count(*) > 1;

-- Righe solo su segnalazioni non migrate
SELECT count(*) FROM public.segnalazioni s
WHERE NOT EXISTS (SELECT 1 FROM public.support_notes n WHERE n.id = s.id);
```

Script repo: `scripts/verify-schema-consolidation.sql`

---

## Fase 5 — Ottimizzazioni sicure (backlog)

| Priorità | Azione | Impatto |
|----------|--------|---------|
| P0 | Applicare migration `20260522120000` su staging | Allineamento RLS/naming |
| P1 | Frontend: rimuovere `segnalazioni` da realtime + cab-sync-bus | Meno rumore cache |
| P1 | Eliminare `segnalazioni.service.ts` o redirect a `support_notes` | Codice morto |
| P2 | Dopo 30gg: `DROP TABLE segnalazioni` + rimuovere da publication | Storage |
| P2 | Consolidare 38 migrations in `SCHEMA.md` (non squash SQL in prod) | Manutenibilità |
| P3 | Enum cleanup: UPDATE profiles SET ruolo = 'guest' WHERE ruolo = 'ospite' | Coerenza DB |
| P3 | Multi-tenant: colonna `tenant_id` + RLS `tenant_id = jwt tenant` | Scaling |

---

## Checklist deploy Supabase (zero downtime)

### Pre-deploy

- [ ] Backup progetto Supabase (Dashboard → Database → Backups)
- [ ] `supabase migration list` — verificare che tutte le migration fino a `20260521180000` siano applicate
- [ ] Eseguire `scripts/verify-schema-consolidation.sql` su **staging** e salvare output
- [ ] Smoke test app: login admin/operatore/cliente, lavorazioni CRUD, upload PDF/foto, supporto, settings

### Deploy

- [ ] `supabase db push` (o CI pipeline migrations) verso staging
- [ ] Ripetere smoke test + verifica script
- [ ] Monitorare log Supabase (errori RLS / permission denied) per 24h
- [ ] Ripetere su produzione in finestra a basso traffico

### Post-deploy

- [ ] `scripts/verify-schema-consolidation.sql` su produzione
- [ ] Confermare: `rbac_resource_allows_*` assenti
- [ ] Confermare: `segnalazioni` senza policy INSERT/UPDATE
- [ ] Confermare: policy `cap_lavorazione_documents_*` presenti
- [ ] Realtime: eventi ancora su tabelle operative

### Rollback (se necessario)

- Migration è reversibile manualmente:
  - Ricreare `rbac_resource_allows_*` da `20260519120000` (solo se servizi esterni li usano — improbabile)
  - Ripristinare policy `rbac_lavorazione_documents_*` (rinominare da cap_*)
  - Ripristinare `cap_segnalazioni_insert/update` da `19150100`

---

## Compatibilità frontend

| Cambiamento schema | Breaking? |
|------------------|-----------|
| Wrapper `current_profile_role` | No |
| Drop `rbac_resource_allows_*` | No (non chiamate da TS) |
| Segnalazioni read-only | No (UI usa `support_notes`) |
| Rename policy lavorazione_documents | No (stesse regole) |

---

## Riferimenti repo

- RBAC TypeScript: `lib/auth/rbac.ts`
- RBAC SQL canonico: `supabase/rbac_core.sql`
- Verifica RLS legacy: `scripts/verify-rls-hardening.sql`
- Verifica post-consolidamento: `scripts/verify-schema-consolidation.sql`
