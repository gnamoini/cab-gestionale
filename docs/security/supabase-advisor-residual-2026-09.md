# Supabase Security Advisor — report finale (2026-09-16)

Progetto: **CAB Gestionale** (`oxmnuovsgenqkuwfolqh`).  
Canonical SQL: [`supabase/migrations/20270316120000_security_advisor_linter_followup.sql`](../../supabase/migrations/20270316120000_security_advisor_linter_followup.sql).

## Stato finale (verificato su remoto)

| Metrica | Valore |
|---------|--------|
| Security Advisor **ERROR** | **0** |
| `anon_definer_exec` | **0** |
| `definer_no_search_path` (non-extension) | **0** |
| `v_invoice_sdi_submissions_legacy` | `security_invoker=true` |
| Tabelle interne 0013 | RLS ON, privilegi client revocati |
| Policy 0024 insert | `rbac_is_operatore_or_admin()` |

---

## Audit iniziale → azione (tabella richiesta)

| Area | Repository | Remoto | Advisor (dopo) | Azione |
|------|------------|--------|----------------|--------|
| **0010** | `20270316120000` view invoker | OK | Nessun ERROR | **FIXED** (già applicato) |
| **0011** | loop `search_path` in `20270316120000` | `definer_no_search_path=0` | Nessun WARN 0011 | **FIXED** |
| **0013** | RLS + REVOKE + trigger SD | RLS ON, no grant client | Nessun ERROR | **FIXED** |
| **0014** | `btree_gist` in `public` | stesso | WARN ×1 | **BACKLOG** (vedi sotto) |
| **0024** | policy operatore/admin | confermato su remoto | Nessun WARN 0024 | **FIXED** |
| **0028** | REVOKE anon/PUBLIC | `anon_definer_exec=0` | Nessun WARN 0028 | **FIXED** |
| **0029** | manifest + architettura RPC | ~180 WARN | WARN ×180 | **INTENTIONAL** |
| **0008** | deny-by-default documentato | 30 tabelle INFO | INFO ×30 | **INTENTIONAL** |
| **leaked passwords** | n/a (dashboard) | disabilitato | WARN ×1 | **DASHBOARD ACTION** |
| **migration history** | stub + `20270316120000` | `20260915234226`, `20260915234901`, poi push `20270316120000` | — | **ALIGNED** (vedi sotto) |

### BEFORE → AFTER (Advisor)

| Lint | BEFORE (segnalazione utente) | AFTER (2026-09-16 remoto) |
|------|------------------------------|---------------------------|
| ERROR total | 3 (0010, 0013×2) | **0** |
| 0010 | ERROR | **FIXED** |
| 0011 | WARN (lista funzioni) | **FIXED** |
| 0013 | ERROR | **FIXED** |
| 0024 | WARN ×2 | **FIXED** |
| 0028 | WARN (anon RPC) | **FIXED** |
| 0029 | WARN (molte RPC) | **INTENTIONAL** |
| 0008 | INFO | **INTENTIONAL_DENY_BY_DEFAULT** |
| 0014 | WARN | **BACKLOG** |
| leaked password | WARN | **DASHBOARD ACTION** |

---

## Fixed

- **0010** — `v_invoice_sdi_submissions_legacy` con `security_invoker = true`.
- **0011** — `search_path = public` su funzioni `public` applicabili (escluse funzioni di estensione).
- **0013** — `accounting_entry_balance_pending`, `admin_billing_customer_migration_map`: RLS, REVOKE client; trigger balance in `SECURITY DEFINER` + `search_path`.
- **0024** — INSERT su `audit_coverage_events` e `mezzo_resolution_events`: solo staff (`rbac_is_operatore_or_admin()`), non `WITH CHECK (true)`.
- **0028** — nessun `EXECUTE` per `anon` su funzioni `SECURITY DEFINER` in `public`.

---

## Intentional / architectural

### 0029 — `authenticated` + SECURITY DEFINER

RPC esposte a `authenticated` per design (contabilità, fatture, RBAC, DDT, notifiche, …). Protezione: **RBAC nella funzione** + [`rpc-access-manifest.json`](./rpc-access-manifest.json).

Report machine-readable: [`rpc-security-advisor-audit-2026-09.json`](./rpc-security-advisor-audit-2026-09.json) — 307 entry manifest, `needs_fix: 0`.

**Non fare:** `REVOKE EXECUTE FROM authenticated` in massa.

### 0008 — RLS senza policy (30 tabelle)

Tutte classificate **INTENTIONAL_DENY_BY_DEFAULT** (worker, outbox, code, contatori, dedup report, tabelle trigger-only). Pattern: `RLS ON` + REVOKE client + accesso `service_role` / SECURITY DEFINER.

| Stato | Tabelle |
|-------|---------|
| **INTENTIONAL_DENY_BY_DEFAULT** | `accounting_entry_balance_pending`, `admin_billing_customer_migration_map`, `attrezzature_dedup_report`, `audit_note_ssot_conflicts`, `cliente_communication_preferences`, `communication_*`, `delivery_queue`, `document_number_sequences`, `invoice_sdi_webhook_receipts`, `lavorazioni_codice_counters`, `mezzi_dedup_report`, `notification_*`, `ordini_fornitori_numero_counters`, `preventivi_*_numero_counters`, `push_subscriptions`, `search_document_rebuild_queue` |
| **NEEDS ACTION** | *nessuna* |

---

## Backlog / non blocking

### 0014 — `btree_gist` in `public`

- Estensione usata da **EXCLUDE USING gist** su `accounting_fiscal_years`, `accounting_periods`, `vat_code_configurations` (vedi `20270111120000`, `20270211120000`).
- Precedente nel repo: `pg_trgm` spostato in schema `extensions` (`20260910120011_move_pg_trgm_to_extensions.sql`).
- Trasferimento `btree_gist` è **fattibile** con `ALTER EXTENSION … SET SCHEMA extensions` ma richiede finestra e verifica dei tre constraint di exclusion; **non eseguito** in questo follow-up per evitare rischio operativo non necessario.

### Auth — leaked password protection

**ACTION REQUIRED IN SUPABASE DASHBOARD**

- Percorso: **Project Settings → Authentication → Password Security** (o Providers → Email).
- Abilitare **Leaked password protection** (Have I Been Pwned).
- Non modificabile via migration SQL nel repository.

---

## Migration history

| Versione | Nome | Repo | Remoto | Note |
|----------|------|------|--------|------|
| `20260915234226` | `security_advisor_linter_followup` | stub noop | applicata (vuota) | allineamento history |
| `20260915234901` | `security_advisor_linter_followup_20270316` | stub noop | replay MCP idempotente | SQL già su DB |
| `20270316120000` | `security_advisor_linter_followup` | **SSOT + gate** | da registrare al prossimo `db push` | idempotente |

**Flusso consigliato:** `supabase db push` applica `20270316120000` (idempotente, include gate di verifica). Non cancellare migration remote già applicate.

---

## Trigger contabilità / SECURITY DEFINER

| Funzione | `SECURITY DEFINER` | `search_path` | `authenticated` EXECUTE |
|----------|-------------------|---------------|-------------------------|
| `accounting_mark_balance_pending` | sì | `public` | **no** |
| `accounting_assert_pending_entries_balanced` | sì | `public` | **no** |
| `trg_*` (invoice/search) | sì | — | **no** |

Smoke remoto (read-only): `pending_client_insert_denied=true`, `pending_rls=true`; trigger su `accounting_entry_lines` attivi.

---

## Validation (eseguita)

```text
npx tsx lib/regression/security-advisor-linter-followup.test.ts          OK
npx tsx lib/regression/security-advisor-migration-history.test.ts        OK (dopo aggiunta stub)
npx tsx lib/regression/security-advisor-critical-hardening.test.ts       OK
npx tsx lib/regression/security-advisor-linter-hardening.test.ts         OK
npx tsx lib/regression/security-definer-anon-execute.test.ts             OK
npx tsx lib/regression/security-definer-manifest-coverage.test.ts        OK
npx tsx lib/accounting/accounting-invariants.test.ts                     OK
npx tsx lib/regression/security-migration-gate.test.ts                   OK
npm run ci:tsc                                                           FAIL (pre-esistente, bklit-adapters.test.ts — fuori scope security)
```

---

## SECURITY ADVISOR FINAL GATE

```text
[PASS] No Supabase Advisor ERROR
[PASS] anon_definer_exec = 0
[PASS] SECURITY DEFINER search_path hardened (non-extension)
[PASS] Internal tables protected
[PASS] Accounting trigger verified (privileges + RLS smoke)
[PASS] RPC manifest aligned (rpc-security-advisor-audit-2026-09.json)
[PASS] Migration history coherent (stubs + canonical 20270316120000)
[PASS] Regression test (security + accounting invariants)
[FAIL] TypeScript — blocco pre-esistente non legato a questo follow-up
[PASS] Documentation

VERDICT: PASS_WITH_DOCUMENTED_RISKS → RELEASE_READY (security advisor scope)
```

**Rischi residui documentati:** 0014 `btree_gist`, 0029 RPC WARN (intenzionale), 0008 INFO (intenzionale), leaked-password dashboard, `ci:tsc` fallimento non correlato.
