# Form UX Migration Engine — Senior Architecture Review

**Data:** 2026-06-10  
**Scope:** Fasi 1–3 (shadow → enforcement → state machine)  
**Metodo:** Analisi statica + logica. Nessuna modifica codice.

---

## Tabella stato sistema (Integrity Audit)

| Area | Verdetto | Note |
|------|----------|------|
| `rollout-config.ts` ↔ `rollout-state-machine.ts` | **RISK** | La state machine clampa solo **avanzamenti**. Se config viene **abbassata** (es. `hard-ssot` → `warn`), `clampConfigTarget` non retrocede: da `hard-ssot` con target `warn` ritorna `kill-legacy`. |
| `rollout-state-machine.ts` ↔ `rollout-controller.ts` | **RISK** | `resolveFinalState()` esiste ma **non è usata** dal controller. Il controller reimplementa un flusso parallelo; due SSOT teorici per la stessa decisione. |
| `rollout-controller.ts` ↔ `resolve-form-submit-payload.ts` | **OK** | Submit passa da `resolveRolloutEnforcement`; reconciliation gated su `soft-ssot+` e `guardResult.ok`. |
| Illegal transitions bloccate | **RISK** | Bloccate solo nel path guard+clamp. **Bypass**: `sessionOverride` applicato senza `canTransition`. `triggerEnforcementRollback` scrive override arbitrario senza state machine. |
| SSOT enforcement decision | **OK** | Tutti i caller passano `resolveFieldEnforcement` → `resolveRolloutEnforcement`. |
| SSOT submit reconciliation | **OK** | Solo `resolveFormSubmitPayload`. |
| SSOT rollback decision | **BROKEN** | Tre meccanismi paralleli: (1) `guardrails.ts` shadow → DEV `form-ux-migration:rollback`; (2) `enforcement-rollback-store.ts`; (3) `rollout-state-machine.ts` → `rollout-state`. |
| Shadow vs enforcement evaluation | **RISK** | `use-form-ux-field-evaluation.ts` esegue entrambi in parallelo. Doppia registrazione snapshot, metriche separate. |
| Shadow vs submit pipeline | **RISK** | Submit usa confronto raw string; evaluation usa normalize. |
| `resolve-form-field-mode.ts` fork | **RISK** | Usa `isFormUxFieldRollbackActive` (fase 1, solo DEV) oltre a `enforcementRes.rollbackActive` (fase 3). |

### Dettaglio RISK/BROKEN critici

**Rollback SSOT frammentato (BROKEN)**  
Non esiste un unico punto che decide rollback. In produzione, shadow mismatch non attiva `guardrails.ts` rollback (DEV-only), ma enforcement/auto-rollback sì. `resolveFormFieldMode` può reagire a rollback shadow in DEV mentre il controller ignora quella chiave.

**Session override bypassa state machine (RISK)**  
`getEnforcementRollbackOverride` può impostare qualsiasi livello senza `clampConfigTarget` né `evaluateRolloutGuard`.

**Config demotion rotta (RISK)**  
Deploy che abbassa enforcement in `rollout-config.ts` non abbassa lo stato effettivo; può spingere verso `kill-legacy`. Solo `off` è affidabile per retrocessione.

**Doppia/tripla invocazione controller per render (RISK)**  
Per ogni render di `MigratedNumberInput`: fino a 3× `resolveRolloutEnforcement`. Mitigato da `lastEmittedState`, ma guard/metriche rivalutate ogni volta.

---

## Failure Mode Analysis

### A. Hydration mismatch SSR/CSR su numerici

| | |
|--|--|
| **Causa root** | Valore prop post-hydration confrontato con `snapshot.normalizedSsot` in registry. Race: snapshot assente o stale al primo paint. |
| **Impatto utente** | A `warn`: telemetria + downgrade. A `soft-ssot+`: reconciliation su snapshot stale. |
| **Probabilità** | Media |
| **Mitigazione** | `recordHydrationMismatch`, `normalizeFormUxValue` |
| **Gap** | Nessun gate "hydration complete" prima del submit |

### B. iOS rapid focus/blur loop durante soft-ssot

| | |
|--|--|
| **Causa root** | 4 blur / 2s senza change → guard rollback |
| **Impatto utente** | Campo torna `off` mid-session; falsi positivi tastiera iOS |
| **Probabilità** | Alta su iOS con soft-ssot |
| **Mitigazione** | Rollback a `off`, `fallback: "legacy"` |
| **Gap** | Nessun debounce sul loop detector |

### C. Mismatch SSOT vs legacy al submit

| | |
|--|--|
| **Causa root** | `resolveFieldValue` usa String(legacy) vs ssot raw, non normalized. `lastWrite` sempre `"legacy"`. |
| **Impatto utente** | A `hard-ssot`: valore salvato può differire da UI; telemetria falsi positivi |
| **Probabilità** | Media a soft/hard-ssot; Bassa oggi (`warn`) |
| **Mitigazione** | `commit` trigger in capture prima di `onSubmit` |
| **Gap** | `last-write-wins` degenera in legacy-wins |

### D. Rollback trigger durante submit

| | |
|--|--|
| **Causa root** | `recordSubmitDivergence` dentro il loop campi può mutare `sessionOverride` mid-flight |
| **Impatto utente** | Submit multi-campo: payload misto |
| **Probabilità** | Bassa oggi (1 campo); Alta con più campi critical |
| **Gap** | Reconciliation non atomica |

### E. sessionStorage vs rollout-config diverging

| | |
|--|--|
| **Causa root** | Tre chiavi sessionStorage; controller prioritizza `enforcement-rollback` |
| **Impatto utente** | Multi-tab: stato diverso tra tab |
| **Probabilità** | Media |
| **Gap** | Nessun `storage` event listener; chiavi possono divergere |

---

## Data Correctness Validation

### Submit pipeline

| Livello | Comportamento |
|---------|---------------|
| `off` / `warn` | **Deterministic** — payload = legacy |
| `soft-ssot+` | **Non-deterministic** — timing snapshot, ordine campi, rollback mid-submit |

### Edge case non coperti

1. Campo mai blur/change prima di submit → snapshot assente → legacy wins silenzioso
2. `incompleteWarnings` usa `currentDraft` non `reconciledDraft` in `ricambio-new-modal.tsx`
3. Registry in-memory non sopravvive a remount modal
4. `submitPrecedence: "ssot-wins"` inerte finché enforcement è `warn`

### normalize() gap

Leading zeros, separatori migliaia, null numerici nel draft, locale iOS unicode minus.

---

## Rollout Safety Assessment

**Rating: PARTIAL**

| Criterio | Valutazione |
|----------|-------------|
| Salti stato via config | Mitigato (+1 step) |
| Salti via override | Non mitigato |
| Oscillazione warn ↔ off | Possibile |
| Auto-rollback loop | SAFE |
| Rollback durante submit | RISK |
| Multi-tab desync | RISK |

---

## Production Verdict

### **NEEDS HARDENING**

Non **READY FOR SSOT ROLLOUT** (`soft-ssot` / `hard-ssot` / `kill-legacy`).

Pilota `shadow` + `enforcement: warn`: accettabile per soak osservazionale.

Segnale **ARCHITECTURE OVER-ENGINEERED**: tre store rollback, doppio runner evaluation, `resolveFinalState` morto, controller side-effectful multiplo per render.

---

## Top 5 rischi (severità)

1. **CRITICAL** — Submit reconciliation semanticamente errata a soft-ssot+ (raw compare + lastWrite sempre legacy)
2. **HIGH** — Rollback decision frammentata (3 meccanismi)
3. **HIGH** — Side-effect rollback durante `resolveFormSubmitPayload`
4. **MEDIUM** — Config demotion rotta in `clampConfigTarget`
5. **MEDIUM** — iOS focus/blur loop falsi positivi

---

## Conclusione operativa

| Fase | Sicurezza |
|------|-----------|
| `warn` + `shadow` (pilota) | Procedere con monitoraggio telemetria |
| `soft-ssot` | Non promuovere senza hardening |
| `hard-ssot` / `kill-legacy` | Bloccato — rischio integrità dati |
