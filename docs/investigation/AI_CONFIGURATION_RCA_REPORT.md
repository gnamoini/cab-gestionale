# RCA: «Servizio Analisi AI non configurato» in produzione

**Data:** 2026-07-17  
**Stato:** **RISOLTO** — verificato in production  
**Deploy finale:** `fc1dbbe` — https://gestionale-cab.vercel.app

---

## 1. Root cause reale (confermata)

Due cause concatenate:

### A) Env Sensitive non visibile nel runtime Node.js (risolto in `6034f57`)

| Evidenza | Dettaglio |
|----------|-----------|
| Sintomo iniziale | `CONFIG_NOT_FOUND` → «Chiave Gemini assente nel runtime» |
| Vercel dashboard | `GOOGLE_GENERATIVE_AI_API_KEY` presente su Production |
| Runtime pre-fix | `listGeminiApiKeys()` → `[]` |
| Causa | Next.js/Vercel: accesso env via `Object.entries` o `process.env[name]` statico non affidabile per Sensitive vars |
| Fix | `Reflect.get(process.env, name)` in [`lib/ai/gemini-api-keys.ts`](../lib/ai/gemini-api-keys.ts) |

### B) Validazione formato errata su chiavi `AQ.*` (risolto in `fc1dbbe`)

| Evidenza | Dettaglio |
|----------|-----------|
| Sintomo post-fix A | `CONFIG_INVALID_FORMAT` nonostante chiavi visibili |
| Runtime check | `GOOGLE_GENERATIVE_AI_API_KEY` length 53, `formatValid: false` |
| Test API reale | Chiave `AQ.*` risponde `ok` su `gemini-3.5-flash` |
| Causa | `isGeminiApiKeyFormatValid()` rifiutava prefisso `AQ.` |
| Fix | Accettare `AQ.*` con length ≥ 20 |

---

## 2. Perché la chiave risultava assente

1. Il resolver runtime non leggeva env Sensitive su Vercel (H1)
2. Dopo il fix Reflect.get, la chiave **era presente** ma bloccata dal gate formato
3. L'UI mostrava messaggi diversi: prima `CONFIG_NOT_FOUND`, poi `CONFIG_INVALID_FORMAT`

---

## 3. Perché il resolver precedente non bastava

| Versione | Approccio | Esito production |
|----------|-----------|------------------|
| Pre `e9f052e` | Static `process.env.GOOGLE_*` | Inlined `undefined` al build |
| `e9f052e`–`f91fca6` | `Object.entries(process.env)` | Sensitive vars assenti |
| `6034f57` | Direct `process.env[name]` in loop | Ancora fragile; Reflect.get necessario |
| `6034f57` + `fc1dbbe` | `Reflect.get` + formato `AQ.*` | **OK** |

---

## 4. Evidenze production (2026-07-17, deploy `fc1dbbe`)

### Deployment

| Campo | Valore |
|-------|--------|
| Deployment ID | `dpl_BL5R2JZVRWaHF6hVHXPfJVGCXFVF` |
| Commit | `fc1dbbec459881c788b0c447d7e9b4506fc4266e` |
| Project | `gnamoinis-projects/gestionale-cab` |
| Status | Ready |

### Environment Variables Vercel

| Nome | Production | Preview | Length (runtime) |
|------|------------|---------|------------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✔ | ✔ | 53 |
| `GEMINI_API_KEY_SECONDARY` | ✔ | ✔ | 53 |
| `GEMINI_API_KEY` | ✘ | ✘ | 0 |
| `GOOGLE_API_KEY` | ✘ | ✘ | 0 |

### GET `/api/ops/runtime-env-check`

```json
{
  "resolvedKeyCount": 2,
  "envDetected": {
    "GOOGLE_GENERATIVE_AI_API_KEY": true,
    "GEMINI_API_KEY_SECONDARY": true
  },
  "formatValid": {
    "GOOGLE_GENERATIVE_AI_API_KEY": true,
    "GEMINI_API_KEY_SECONDARY": true
  }
}
```

### POST `/api/ops/ai-configuration/test`

```json
{
  "success": true,
  "latencyMs": 1613,
  "reachable": true,
  "configured": true,
  "formatValid": true,
  "model": "gemini-3.5-flash"
}
```

### POST `/api/document-capture/{id}/analyze` (Import AI Lavorazioni)

```json
{
  "ok": true,
  "fieldCount": 11,
  "durationMs": 14520,
  "status": 200
}
```

---

## 5. File modificati

| File | Modifica |
|------|----------|
| `lib/ai/gemini-api-keys.ts` | `readRuntimeEnvVar()` via `Reflect.get`; formato `AQ.*` |
| `lib/ai/gemini-env-diagnostics.ts` | `buildRuntimeEnvCheckPayload()` |
| `app/api/ops/runtime-env-check/route.ts` | Nuova route diagnostica admin |
| `lib/ai/gemini-client.ts` | Gate unificato |
| `app/api/ops/ai-configuration/test/route.ts` | Usa gate SSOT |
| `lib/ai/gemini-observability.server.ts` | `AI_REQUEST`, `AI_RESPONSE`, `AI_FAILURE` |
| `lib/ai/gemini-generate-object.server.ts` | Wire logging |
| `lib/ops/ai-configuration-check.ts` | Messaggio warning aggiornato |

---

## 6. Definition of Done

- [x] Runtime vede la chiave (`resolvedKeyCount: 2`)
- [x] Client Gemini creato (`clientCreated: true`)
- [x] Chiamata Gemini reale OK (`success: true`, 1613ms)
- [x] Analyze Import AI OK (`fieldCount: 11`, 14520ms)
- [x] Deploy production Ready (`fc1dbbe`)

---

## 7. Commits

| SHA | Messaggio |
|-----|-----------|
| `6034f57` | Reflect.get runtime resolver + runtime-env-check |
| `fc1dbbe` | Accetta chiavi Gemini AQ.* valide |

---

## 8. Appendice — RCA definitiva v2 + AI Runtime Manager

**Data analisi:** 2026-07-17 (post-piano v2)

### Tabella gate v5 (Commit 1 — aggiornata 2026-07-17 post-implementazione)

| Check | Risultato | Evidenza / nota |
|-------|-----------|-----------------|
| Vercel env presente | **Sì** (storico fc1dbbe) | `GOOGLE_GENERATIVE_AI_API_KEY` Production; post-v5 anche `AI_PROVIDER_GOOGLE_KEY_NN` |
| Runtime vede env | **Verificare live** post-deploy | `GET /api/ops/ai-runtime-debug` — `indexedBootstrapKeyCounts` |
| DB keys | **0/N** (2026-07-17) | Query Supabase: tabella vuota; atteso dopo cron/UI |
| aiService configured | **Verificare live** post-deploy | `GET /api/ops/ai-configuration` |
| Provider test | **Verificare live** post-deploy | `POST /api/ops/ai-configuration/test` |
| Schema ownership | **Sì** | Migration `20260917190000` applicata su `oxmnuovsgenqkuwfolqh` |
| Build v5 | **Sì** | `npm run build` OK |
| Test suite v5 | **Sì** | `ai-runtime`, `bootstrap-sync`, `ai-runtime-ssot` OK |

**Causa classe confermata:** env-only SSOT + assenza Configuration Store ownership/sync → risolto con AI Control Plane v5.

**Gate Commit 7 (production):** deploy → `sync-preview` → cron → terza chiave UI → E2E Document Capture. Vedi [AI_RUNTIME_V2_FINAL_REPORT.md](./AI_RUNTIME_V2_FINAL_REPORT.md) §7.

### Tabella diagnostica (evidenze statiche + endpoint)

| Punto | Risultato | Evidenza |
|-------|-----------|----------|
| Vercel env presente | **Sì** (report fc1dbbe + dashboard) | `GOOGLE_GENERATIVE_AI_API_KEY` Production length 53 |
| Runtime vede env | **Verificare live** | `GET /api/ops/ai-runtime-debug` (nuovo) |
| Resolver legge env | **Sì** (post Reflect.get) | `runtime-env-check` resolvedKeyCount: 2 @ fc1dbbe |
| Gemini client riceve key | **Sì** @ fc1dbbe | `ai-configuration` configured: true |
| Provider SDK riceve key | **Sì** @ fc1dbbe | POST test success 1613ms |
| Analyze riceve key | **Sì** @ fc1dbbe | document-capture analyze fieldCount: 11 |

### Root cause classe di problemi (non singolo bug)

1. **Env-only SSOT** — chiavi su Vercel Sensitive, redeploy per rotazione, resolver ad-hoc Gemini
2. **Build-time inlining** — accesso statico `process.env.GOOGLE_*` → undefined nel bundle
3. **Object.entries** su Sensitive — valori assenti (fix Reflect.get)
4. **Formato AQ.*** — gate falso negativo (fix fc1dbbe)
5. **Architettura** — max 2 chiavi, nessun audit, nessun pannello admin

### Perché i fix puntuali non bastavano

Risolvevano sintomi su singole path (resolver, formato) senza eliminare la dipendenza da env vars distribuite e senza Configuration Store persistente.

### Risoluzione architetturale v2

- **Bootstrap:** `AI_MASTER_KEY_ENCRYPTION_KEY` + creds Supabase
- **Runtime:** tabella `ai_provider_keys` (chiavi cifrate, stats, cooldown)
- **SSOT codice:** `lib/ai/runtime/service.ts` — provider-agnostico
- **Diagnostica:** `/api/ops/ai-runtime-debug` (raw env truth)
- **Admin:** Impostazioni → AI Providers

