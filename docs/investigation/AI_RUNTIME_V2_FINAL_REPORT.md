# AI Runtime Manager v2 — Report finale (v5)

**Data:** 2026-07-17  
**Stato:** Implementazione codice completa — deploy production + terza chiave = azioni operatore

---

## 1. Root cause originale

Classe di errori `CONFIG_NOT_FOUND` / «Chiave Gemini assente nel runtime» causata da:

- API keys come unica fonte Vercel Sensitive env (fragile, redeploy per rotazione)
- Inlining build-time `process.env.GOOGLE_*` → undefined
- Resolver `Object.entries` inadeguato su Sensitive vars (fix Reflect.get)
- Validazione formato `AQ.*` errata (fix fc1dbbe)
- Architettura Gemini-centrica senza Configuration Store persistente

Vedi tabella completa: [AI_CONFIGURATION_RCA_REPORT.md](./AI_CONFIGURATION_RCA_REPORT.md) §8.

---

## 2. Perché i fix precedenti non bastavano

Fix `6034f57` e `fc1dbbe` risolvevano sintomi puntuali ma lasciavano:

- SSOT distribuito su `gemini-api-keys` / `gemini-client`
- Max 2 chiavi hardcoded (`GEMINI_API_KEY_*`)
- Nessun audit, stats, cooldown cross-instance
- Nessun pannello admin né rotazione sicura

---

## 3. Architettura v5 (AI Control Plane)

```
Vercel bootstrap env              Supabase SSOT
AI_MASTER_KEY_ENCRYPTION_KEY      ai_provider_keys (encrypted)
AI_PROVIDER_{PROVIDER}_KEY_NN     ai_provider_key_audit
Legacy env (compat)                      ↓
        ↓                    key-ingest (NEW/EXISTING/RECOVERY)
        └──── sync-runtime-config ← cron / sync-preview
                      ↓
              lib/ai/runtime/service.ts
                      ↓
         Document Capture / Import / Report …
```

**Ownership:** `source` + `managed_by` + `disabled_reason` + `rotation_replaced_by`  
**Sync disable guard:** solo `managed_by=runtime_sync` + assente da env + `sync_confidence=true`  
**Provider test:** `testProviderKey(provider, key)` via registry (no `testGeminiKey`)

ADR: [ADR-008](../adr/ADR-008-ai-runtime-manager.md)

---

## 4. File principali (v5)

| Area | Path |
|------|------|
| Service SSOT | `lib/ai/runtime/service.ts` |
| Ingest pipeline | `lib/ai/runtime/key-ingest.ts`, `ingest-mode.ts` |
| Sync engine | `lib/ai/runtime/sync-runtime-config.ts` |
| Env scan (indexed 01–100) | `lib/ai/runtime/env-reader.ts` |
| Provider registry | `lib/ai/runtime/providers/registry.ts` |
| Cron sync | `app/api/cron/ai-runtime-sync/route.ts` |
| Dry-run preview | `app/api/ops/ai-runtime/sync-preview/route.ts` |
| Admin UI | `components/gestionale/impostazioni/ai-providers-settings-page.tsx` |
| Rotate API | `app/api/admin/ai-providers/keys/[id]/rotate/route.ts` |
| Migrations | `20260917180000_ai_provider_keys.sql`, `20260917190000_ai_provider_keys_ownership.sql` |
| Tests | `ai-runtime.test.ts`, `bootstrap-sync.test.ts`, `ai-runtime-ssot.test.ts` |

---

## 5. Env Vercel richieste

```bash
AI_MASTER_KEY_ENCRYPTION_KEY=          # obbligatorio per DB keys
CRON_SECRET=                           # auth cron sync
AI_RUNTIME_BOOTSTRAP_FALLBACK_ENABLED=true   # false post-stabilizzazione

# Bootstrap scalabile (cron → DB)
AI_PROVIDER_GOOGLE_KEY_01=
AI_PROVIDER_GOOGLE_KEY_02=
AI_PROVIDER_GOOGLE_KEY_03=             # opzionale, terza via env

# Legacy compat (deprecate)
# GOOGLE_GENERATIVE_AI_API_KEY=
# GEMINI_API_KEY_SECONDARY=
```

**Non usare:** `GEMINI_API_KEY_TERTIARY`, scan `Object.keys(process.env)`, sync su hot path `generateObject`/`generateText`.

---

## 6. Test effettuati (sviluppo)

| Caso | Esito |
|------|-------|
| `npm run build` | OK |
| `lib/ai/runtime/ai-runtime.test.ts` | OK |
| `lib/ai/runtime/bootstrap-sync.test.ts` | OK (ingest mode + format validation) |
| `lib/regression/ai-runtime-ssot.test.ts` | OK |
| Migration ownership su Supabase `oxmnuovsgenqkuwfolqh` | OK (colonne `source`, `managed_by`, `disabled_reason`, `rotation_replaced_by`) |
| DB `ai_provider_keys` count (2026-07-17) | **0** — atteso fino a bootstrap/cron o UI admin |
| Local bootstrap env scan | **0 chiavi** — `.env.local` senza `AI_PROVIDER_*` |

### Matrice piano v5 (codice)

| Caso | Copertura |
|------|-----------|
| dedup fingerprint | `key-ingest.ts` |
| env removal + confidence | `sync-runtime-config.ts` |
| env scan fail → no disable | `syncConfidence` guard |
| EXISTING cron → no test | `ingestProviderKey` mode branch |
| RECOVERY backoff | `resolveIngestMode` + status/cooldown |
| admin_ui key mai disabilitata da sync | filter `managed_by=runtime_sync` |
| sync-preview dry-run | `dryRun: true` → zero write |
| rotate | `rotateProviderKey` + `rotation_replaced_by` |

---

## 7. Deploy production — runbook (Commit 7)

### 7.1 Pre-deploy

1. Merge/deploy branch con AI Runtime v5
2. Vercel Production env:
   - `AI_MASTER_KEY_ENCRYPTION_KEY` (nuovo secret)
   - `CRON_SECRET`
   - `AI_PROVIDER_GOOGLE_KEY_01`, `_02` (e opz. `_03`)
   - Mantenere legacy fino a soak: `GOOGLE_GENERATIVE_AI_API_KEY`

### 7.2 Post-deploy — verifica ops (auth ops admin)

```http
GET /api/ops/ai-runtime-debug
GET /api/ops/ai-runtime/sync-preview    # dry-run: wouldCreate/Disable/Update
GET /api/ops/ai-runtime/keys
POST /api/ops/ai-configuration/test
```

**Atteso dopo primo sync:** `sync-preview.syncConfidence: true`, chiavi in DB da env bootstrap.

### 7.3 Cron Vercel

Route: `GET /api/cron/ai-runtime-sync`  
Header: `Authorization: Bearer <CRON_SECRET>`  
Schedule consigliato: ogni 5–10 min (configurare in Vercel Cron dashboard — non c’è `vercel.json` nel repo).

**Ordine obbligatorio:** eseguire `sync-preview` manualmente, verificare output, poi abilitare cron.

### 7.4 Terza chiave (UI — chiave ruotata)

1. Aprire `/impostazioni/ai-providers`
2. **Rotate** su una chiave esistente **oppure** **Test & Save** con nuova chiave (mode NEW)
3. Usare **solo** chiave nuova ruotata da Google AI Studio
4. **Non** usare chiavi esposte in chat/log

**Alternativa env:** `AI_PROVIDER_GOOGLE_KEY_03` su Vercel → `sync-preview` → `wouldCreate: ["google-03"]` → cron.

### 7.5 E2E funzionale

1. Document Capture → analyze (campi estratti)
2. Import AI (parse/preview)
3. Failover: disabilitare una chiave in UI, verificare richiesta con altra key

---

## 8. Risultato Preview (rollout 2026-07-17)

| Check | Stato | Evidenza |
|-------|-------|----------|
| Gate codice v5 | **OK** | build + `ai-runtime` / `bootstrap-sync` / `ai-runtime-ssot` tests |
| Anti-pattern | **OK** | nessun `GEMINI_API_KEY_TERTIARY` in codice |
| Migration ownership | **OK** | colonne `source`, `managed_by`, `disabled_reason`, `rotation_replaced_by` |
| sync-preview dry-run puro | **OK** | refactor `sync-runtime-config.ts` — no `ingestProviderKey` in dryRun |
| Preview deploy | **OK** | https://gestionale-p637d25vv-gnamoinis-projects.vercel.app (`dpl_6MFMBXFw2HWGQHY79qrKSPM8pANA`) |
| Production | **Non toccata** | `gestionale-cab.vercel.app` resta pre-promozione v5 |
| Env Preview | **OK** | `AI_MASTER_KEY_ENCRYPTION_KEY`, `AI_RUNTIME_BOOTSTRAP_FALLBACK_ENABLED`, `CRON_SECRET` (preview); legacy Google già su Preview |
| `vercel.json` cron | **OK (Hobby)** | `ai-runtime-sync` daily `0 3 * * *` — preview usa curl manuale |
| DB keys | **2** | `google-legacy-01`, `google-legacy-04` — `env_bootstrap` / `runtime_sync` |
| Cron sync manuale | **OK** | `updated: 2`, `syncConfidence: true` (localhost + Supabase condiviso) |
| Terza chiave UI | **Pending** | richiede nuova chiave Google AI Studio (no chiavi chat) |
| Document Capture E2E | **Pending** | Google API timeout/rate-limit da rete locale; richiede `SMOKE_ADMIN_*` su preview protetto SSO |
| Failover | **Parziale** | logica skip key invalid verificata; chiamata provider timeout locale |

### Preview URL e deploy

- **URL:** https://gestionale-p637d25vv-gnamoinis-projects.vercel.app
- **Deployment:** `dpl_6MFMBXFw2HWGQHY79qrKSPM8pANA`
- **Deploy source:** working tree locale (`vercel deploy`, non ancora commit git)
- **Nota:** preview protetto Vercel SSO — ops UI richiede login; sync DB eseguito via dev locale + Supabase condiviso

### Tabella RCA Preview

| Check | Risultato |
|-------|-----------|
| Runtime env (legacy Google) | **YES** (già su Preview + local) |
| DB keys count | **2** |
| aiService configured (DB) | **OK** (decrypt + load verificato) |
| Provider test live | **FAIL** (timeout / high demand Google API) |
| sync-preview side effect | **0** audit delta (dry-run puro) |

### Prossimi passi operatore

1. Login admin su preview URL → `GET /api/ops/ai-runtime/sync-preview`
2. `curl` cron su preview (con bypass SSO o da Vercel dashboard)
3. Generare KEY_03 in Google AI Studio → `/impostazioni/ai-providers` Test & Save
4. E2E Document Capture + Import con `SMOKE_ADMIN_*`
5. Promozione production + cron Pro (`*/5`) se upgrade piano

---

## 9. Risultato production

| Check | Stato 2026-07-17 |
|-------|------------------|
| Codice v5 in repo | Implementato — preview deployato, production non promossa |
| Migration Supabase | Applicata |
| DB keys ≥ 1 | **OK** (2 chiavi preview bootstrap) |
| Terza chiave | **Pending** — UI con chiave nuova ruotata |
| Ops endpoints live | Preview deployato (SSO protection) |
| Document Capture E2E | **Pending** — provider timeout + credenziali smoke |

---

## 10. Problemi residui

- `isConfigured()` in report-analysis usa hint legacy env per UI — `generate()` fa check async completo
- Health cross-instance: cooldown in DB; cache locale TTL 45s
- Provider OpenAI/Anthropic: stub registry, non implementati
- Cron schedule: `vercel.json` daily su Hobby; `*/5` richiede Vercel Pro
- Cold-start fallback: solo DB vuoto + `AI_RUNTIME_BOOTSTRAP_FALLBACK_ENABLED=true` (cron è path primario)
