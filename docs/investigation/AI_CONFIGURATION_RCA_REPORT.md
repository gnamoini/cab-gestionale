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
