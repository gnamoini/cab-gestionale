# RCA: «Servizio Analisi AI non configurato» in produzione

**Data:** 2026-07-17  
**Flusso:** Lavorazioni → Import AI (Document Capture)  
**Deploy corrente:** `6034f57` — `fix(ai): Reflect.get runtime resolver + production env diagnostic route`  
**Stato:** Fix deployato — **verifica admin production pendente**

---

## 1. Sintomo

In produzione, durante **Lavorazioni → Import AI**, l’UI mostra:

> Chiave Gemini assente nel runtime. Verifica GOOGLE_GENERATIVE_AI_API_KEY in Vercel Production.

HTTP: `503`, body `code: "not_configured"`, `errorType: "CONFIG_NOT_FOUND"`.

---

## 2. Root cause reale (evidence-based)

### Causa primaria: env Sensitive non visibile nel runtime Node.js

| Evidenza | Dettaglio |
|----------|-----------|
| Messaggio UI | `CONFIG_NOT_FOUND` → `listGeminiApiKeys()` ritorna `[]` a runtime |
| Vercel dashboard | `GOOGLE_GENERATIVE_AI_API_KEY` + `GEMINI_API_KEY_SECONDARY` presenti su **Production** (Encrypted, 8h fa) |
| Deploy | `f91fca6` deployato **dopo** aggiunta env (6h fa deploy vs 8h fa env) |
| Fix H1 insufficiente | Direct `process.env[name]` in loop non basta — Next.js può ancora inlineare accessi statici; `Object.entries` non include Sensitive |

### Causa secondaria (se env diventa visibile): formato chiave Vertex `AQ.*`

Chiavi in formato `AQ.*` (Vertex) vengono **rifiutate** da `isGeminiApiKeyFormatValid` → `CONFIG_INVALID_FORMAT`, non `CONFIG_NOT_FOUND`.

Per Generative Language API servono chiavi **Google AI Studio** (`AIza…`).

---

## 3. Perché il resolver precedente non bastava

1. **`Object.entries(process.env)`** — non include env Sensitive su Vercel Lambda
2. **`process.env[name]` in loop** — miglioramento H1 ma ancora vulnerabile a bundling Next
3. **Fix definitivo (`6034f57`)** — `Reflect.get(process.env, name)` come unico path runtime SSOT (ADR-007)

---

## 4. Tabella Environment Variables Vercel

**Project:** `gnamoinis-projects/gestionale-cab`  
**Domain:** `gestionale-cab.vercel.app`

| Nome | Production | Preview | Development | Encrypted | Ultima modifica |
|------|------------|---------|-------------|-----------|-----------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✔ | ✔ | ✘ | ✔ | ~8h fa |
| `GEMINI_API_KEY_SECONDARY` | ✔ | ✔ | ✘ | ✔ | ~8h fa |
| `GEMINI_API_KEY` | ✘ | ✘ | ✘ | — | — |
| `GOOGLE_API_KEY` | ✘ | ✘ | ✘ | — | — |

Length non disponibile via CLI (valori `[SENSITIVE]`). Usare `GET /api/ops/runtime-env-check` in production con sessione admin.

---

## 5. Deployment

| Campo | Valore |
|-------|--------|
| Deployment ID | `dpl_AQXu9yuuDqF7G7ydgQxAXTzg9Rh9` |
| Commit | `6034f57` |
| Branch | `main` |
| Status | Ready |
| URL | https://gestionale-cab.vercel.app |
| Build | 3m, Node 24.x |

---

## 6. Fix applicati (`6034f57`)

| File | Modifica |
|------|----------|
| `lib/ai/gemini-api-keys.ts` | `readRuntimeEnvVar()` via `Reflect.get`; `inspectGeminiKeyFormat()` |
| `lib/ai/gemini-env-diagnostics.ts` | `buildRuntimeEnvCheckPayload()` |
| `app/api/ops/runtime-env-check/route.ts` | **nuovo** — probe runtime admin |
| `lib/ai/gemini-client.ts` | Gate unificato con `inspectGeminiKeyFormat` |
| `app/api/ops/ai-configuration/test/route.ts` | Usa `resolveGeminiConfigurationGate()` |
| `lib/ai/gemini-observability.server.ts` | `AI_REQUEST`, `AI_RESPONSE`, `AI_FAILURE` |
| `lib/ai/gemini-generate-object.server.ts` | Wire logging |

---

## 7. Verifica production (da eseguire come admin Sicurezza)

### Step 1 — Runtime env check

```
GET https://gestionale-cab.vercel.app/api/ops/runtime-env-check
```

Atteso:
- `envDetected.GOOGLE_GENERATIVE_AI_API_KEY: true`
- `lengths.GOOGLE_GENERATIVE_AI_API_KEY > 0`
- `resolvedKeyCount >= 1`

### Step 2 — Test Gemini reale

```
POST https://gestionale-cab.vercel.app/api/ops/ai-configuration/test
```

Atteso: `{ "success": true, "latencyMs": < 10000 }`

Se `CONFIG_INVALID_FORMAT` → sostituire chiavi Vercel con chiavi `AIza…` da [Google AI Studio](https://aistudio.google.com/apikey), poi **redeploy**.

### Step 3 — Import AI Lavorazioni

Upload scheda → Analizza → campi estratti.

---

## 8. Test eseguiti (CI locale)

| Test | Esito |
|------|-------|
| `npm run ci:tsc` | PASS |
| `gemini-resolver-runtime.test.ts` | PASS |
| `gemini-failover.test.ts` | PASS |
| `gemini-ai-ssot.test.ts` | PASS |
| Vercel Production build | Ready (`6034f57`) |
| Production runtime check | **Pendente** (richiede sessione admin) |
| Production Gemini call | **Pendente** |

---

## 9. Rischi residui

- Chiavi `AQ.*` su Vercel → env visibile ma `formatValid: false`
- Env modificata senza redeploy successivo
- Progetto Vercel errato (`cab-gestionale` è un progetto separato)

---

## 10. Definition of Done

- [x] Fix Reflect.get deployato su production
- [x] Route `runtime-env-check` disponibile
- [ ] Runtime vede la chiave (admin GET)
- [ ] POST test Gemini `success: true`
- [ ] Import AI Lavorazioni funzionante

**Blocco attuale:** endpoint ops richiedono login admin — agente non ha credenziali production.
