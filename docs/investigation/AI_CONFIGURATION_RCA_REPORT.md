# RCA: «Servizio Analisi AI non configurato» in produzione

**Data:** 2026-07-17  
**Flusso:** Lavorazioni → Import AI (Document Capture)  
**Ultimo deploy analizzato:** `ef9cef3` (`update production version`)  
**Stato:** Fix H1 implementato in working tree — **verifica production post-deploy pendente**

---

## 1. Sintomo

In produzione, durante **Lavorazioni → Import AI**, dopo upload e analisi documento, l’UI mostra:

> Servizio Analisi AI non configurato. Imposta GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY o GOOGLE_API_KEY.

HTTP: `503`, body `code: "not_configured"`.

---

## 2. Stack end-to-end (Lavorazioni)

| Passo | Componente | File |
|-------|------------|------|
| 1 | Launcher UI | `components/document-capture/lavorazioni-digital-capture-launcher.tsx` |
| 2 | Wizard analyze | `components/document-capture/document-capture-wizard-modal.tsx` → `runAnalyze()` |
| 3 | API | `POST /api/document-capture/[id]/analyze` (`runtime = "nodejs"`) |
| 4 | Pipeline v4.1 | `lib/document-capture/pipeline/analyze-capture-v41.server.ts` |
| 5 | Gate Gemini | `resolveGeminiConfigurationGate()` → `lib/ai/gemini-client.ts` |
| 6 | Resolver chiavi | `listGeminiApiKeys()` → `resolveGeminiApiKeysFromEnv()` → `lib/ai/gemini-api-keys.ts` |

Messaggio SSOT unico: `GEMINI_NOT_CONFIGURED_MESSAGE` in `lib/ai/gemini-client.ts`.

**Conclusione logica:** `listGeminiApiKeys()` ritorna `[]` a runtime in production, non un errore auth/quota (che userebbero `auth_invalid` o messaggi distinti).

---

## 3. Ipotesi e evidenze

| ID | Ipotesi | Evidenza | Esito |
|----|---------|----------|-------|
| **H1** | `Object.entries(process.env)` su Vercel/Next non espone env **Sensitive**; lookup diretto `process.env[name]` sì | Pattern noto su serverless; resolver pre-fix usava solo `entries` scan | **Probabile root cause** — fix applicato |
| **H2** | Chiavi assenti su Production | `npx vercel env ls production` → `GOOGLE_GENERATIVE_AI_API_KEY` + `GEMINI_API_KEY_SECONDARY` presenti (Encrypted, Production+Preview) | **Esclusa** (env configurato) |
| **H3** | Production su commit vecchio | Deploy `ef9cef3` confermato Ready; diagnostic espone `commitSha` post-fix | Da ri-verificare post-deploy RCA |
| **H4** | Chiave presente ma vuota dopo trim | Possibile se typo; diagnostic `keyLength` post-fix | Da verificare in GET admin |
| **H5** | Chiave Vertex `AQ.*` | Con chiave presente → `configured: true`; errore sarebbe auth, non `not_configured` | **Esclusa** per questo sintomo |

---

## 4. Prove raccolte

### 4.1 Vercel env (CLI, 2026-07-17)

```
GOOGLE_GENERATIVE_AI_API_KEY    Encrypted    Production, Preview
GEMINI_API_KEY_SECONDARY        Encrypted    Production, Preview
```

→ H2 esclusa: le variabili esistono su Production.

### 4.2 Endpoint diagnostic (production, senza sessione admin)

`GET https://gestionale-cab.vercel.app/api/ops/ai-configuration` → **HTTP 307** (redirect auth).

Endpoint protetto da `requireOpsAdmin` (Sicurezza). Prove runtime complete richiedono sessione admin.

### 4.3 Audit codice (pre-fix `ef9cef3`)

`resolveFromRuntimeProcessEnv()` usava `Object.entries(process.env)` come unico path runtime.

---

## 5. Root cause (conclusione)

**Causa primaria (H1):** il resolver runtime non trovava chiavi Gemini perché lo scan `Object.entries(process.env)` può non includere variabili Sensitive su bundle Vercel/Next, mentre `process.env.GOOGLE_GENERATIVE_AI_API_KEY` funziona.

Effetto: `isGeminiConfigured()` → `false` → `not_configured` + messaggio SSOT, nonostante chiavi configurate su Vercel.

---

## 6. Correzione SSOT applicata

### 6.1 Resolver (`lib/ai/gemini-api-keys.ts`)

- Lookup **diretto** `process.env[name]` per PRIMARY + SECONDARY **prima**
- Fallback `Object.entries` solo se direct non trova nulla
- `resolvePrimaryGeminiEnvSource()` usa direct lookup

### 6.2 Diagnostic ops

- `GET /api/ops/ai-configuration` — payload con `resolver` (entries vs direct), `commitSha`, `deploymentId`
- `POST /api/ops/ai-configuration/test` — health check Gemini + `errorType`

### 6.3 Osservabilità

- `lib/ai/gemini-observability.server.ts` — eventi `AI_CONFIGURATION_CHECK`, `AI_CLIENT_CREATED`, `AI_REQUEST_FAILED`
- Log su `isGeminiConfigured() === false`

### 6.4 Tassonomia errori

- `lib/ai/gemini-error-types.ts` — `GeminiErrorType` + `classifyGeminiError()`
- `resolveGeminiConfigurationGate()` — `CONFIG_NOT_FOUND` | `CONFIG_EMPTY` | `CONFIG_INVALID_FORMAT`
- Pipeline analyze + API route + wizard UI espongono `errorType`

### 6.5 Test

- `lib/ai/gemini-resolver-runtime.test.ts` — precedence env, direct lookup, `resolveConfigurationErrorType`
- `gemini-failover.test.ts`, `gemini-ai-ssot.test.ts` — OK
- `npm run ci:tsc` — PASS
- `npm run build` — PASS

---

## 7. Checklist accettazione (post-deploy)

| Check | Criterio | Stato |
|-------|----------|-------|
| Diagnostic GET prod | `configured: true`, `geminiKeysViaDirect: true`, `resolverMismatch: false` | ⏳ Pendente (serve deploy + admin) |
| Diagnostic POST prod | `success: true`, `latencyMs` < 10s | ⏳ Pendente |
| Lavorazioni Import AI | Upload → Analizza → campi estratti, no `not_configured` | ⏳ Pendente |
| Preview | Stesso test | ⏳ Pendente |
| CI locale | tsc + build + test gemini | ✅ |

### Comandi verifica admin (dopo deploy)

1. Login come admin Sicurezza su production
2. `GET /api/ops/ai-configuration` — verificare `configured`, `resolver`, `commitSha`
3. `POST /api/ops/ai-configuration/test` — verificare `success: true`
4. Lavorazioni → Import AI → smoke analyze

---

## 8. Rischi residui

- Chiavi `AQ.*` (Vertex): `formatValid: false` → errore auth esplicito, non più mascherato
- PDF grandi: timeout analyze — errore distinto da configurazione
- Diagnostic POST consuma quota minima (admin-only)

---

## 9. Cosa NON è stato fatto

- Nessun workaround `process.env` nei file feature (SSOT rispettato)
- Nessuna esposizione chiavi in log o API
- Nessun `env` in `next.config.ts` per Gemini

---

## 10. Deliverable summary

1. ✅ Sintomo e contesto documentati  
2. ✅ Stack Lavorazioni tracciato  
3. ✅ SSOT messaggio identificato  
4. ✅ Ipotesi H1–H5 valutate  
5. ✅ Evidenza Vercel env (H2 esclusa)  
6. ✅ Root cause H1 con fix resolver  
7. ✅ Endpoint diagnostic estesi  
8. ✅ Tassonomia errori + osservabilità  
9. ✅ Test e build locali verdi  
10. ⏳ Verifica production end-to-end — **bloccata fino a deploy + sessione admin**

---

## Prossimo passo operativo

Commit + push su `main` → attendere Vercel Ready → eseguire checklist §7 con sessione admin.
