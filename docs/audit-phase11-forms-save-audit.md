# FASE 11 — Audit form e salvataggi (Gestionale CAB)

Inventario create/update/delete, undo, validazione e rischio perdita dati per modulo. Stato verificato **2026-06-02** post-fix fasi 1–10.

**Documenti correlati:** [`audit-phase4-edge-cases.md`](./audit-phase4-edge-cases.md) · [`audit-phase5-storage-audit.md`](./audit-phase5-storage-audit.md)

**Legenda:** ✅ gestito · ⚠️ parziale · ❌ gap · 📋 backlog · 🔧 fix audit applicato

---

## Sintesi esecutiva

| Modulo | Perdita dati | Unsaved guard | Validazione | Undo |
|--------|--------------|---------------|-------------|------|
| Lavorazioni | 🟠 MEDIO (schede hub) | ✅ schede modal | ✅ entity | ✅ log |
| Preventivi | 🟠 MEDIO (draft) | ✅ editor modal | ✅ custom | Local log |
| Documenti | 🔴 ALTO (upload) | ⚠️ modale resta aperta | ✅ file/size | Local log |
| Magazzino / Mezzi | 🟢 BASSO | Confirm delete | ✅ similar gate | ✅ |
| Dipendenti | 🟢 post-fix flush | ✅ beforeunload/pagehide | ✅ timesheet rules | — |
| Impostazioni | 🟠 MEDIO | ✅ beforeunload + nav | ✅ similar gate | — |
| Security permessi | 🟢 BASSO | ✅ beforeunload | ✅ admin-user-validation | — |
| BUNDER | 🟢 post-fix | 🔧 unsaved dialog + beforeunload | ⚠️ minimal | Local log |
| Promemoria | 🟢 BASSO | ⚠️ no guard chiusura | ✅ titolo required | — |

---

## Pattern comuni

| Pattern | Uso | File |
|---------|-----|------|
| `useGestionaleConfirm` | Delete / azioni distruttive | magazzino, mezzi, bunder, promemoria |
| `GestionaleUnsavedChangesDialog` | Modali editor lunghe | preventivi, schede, **BUNDER** |
| `useBeforeUnloadWhenDirty` | Tab close / refresh | **BUNDER** (nuovo hook riusabile) |
| `beforeunload` inline | Bulk settings / permessi | impostazioni, security-users |
| `useServiceMutation` | Persist API + invalidate | hooks dominio |
| Debounce + flush | Timesheet celle | `use-dipendenti-timesheet` |

---

## Matrice modulo × operazioni

### Lavorazioni
| Op | Meccanismo | Rischio |
|----|------------|---------|
| Create | `LavorazioneCreateModal` + service | MEDIO — schede post-create |
| Update | Inline table + modals | Basso |
| Delete | Soft delete + confirm | ✅ restore via log |
| Hub schede | `schede-lavorazione-modal` + unsaved dialog | MEDIO — multi-tab (fase 9) |

### Preventivi
| Op | Meccanismo | Rischio |
|----|------------|---------|
| Editor | `preventivi-editor-modal` draft locale | MEDIO — sessionStorage bridge `cab-pending-preventivo-lav-v1` |
| Unsaved | `GestionaleUnsavedChangesDialog` | ✅ |
| PDF | POST inline API | ✅ fase 7 |

### Documenti
| Op | Meccanismo | Rischio |
|----|------------|---------|
| Upload | blob → storage → row insert | **ALTO** se storage ok ma insert fail (orphan file) |
| UX fail | Modale resta aperta su errore | ✅ retry |
| Validazione | `documenti-form-validation.ts` | ✅ |

### Dipendenti (timesheet)
| Op | Meccanismo | Rischio |
|----|------------|---------|
| Cell save | Debounce 400ms | ✅ flush `beforeunload`/`pagehide` (fase 1) |
| Sync cross-tab | dispatch fase 9 | ✅ |
| Bootstrap | syncFromAddetti | RBAC gate |

### Impostazioni
| Op | Meccanismo | Rischio |
|----|------------|---------|
| Bulk save | Snapshot diff + confirm discard | ✅ |
| Nav away | click interceptor link interni | ✅ |
| beforeunload | isDirty | ✅ |

### Security
| Op | Meccanismo | Rischio |
|----|------------|---------|
| Users CRUD | modals + server actions | ✅ validation fase 7 |
| Permissions matrix | draft + save batch | ✅ beforeunload isDirty |

### BUNDER
| Op | Meccanismo | Rischio |
|----|------------|---------|
| Persist | DB via `bunder-sync-adapter` | ✅ (ex localStorage CRITICO) |
| Editor close | 🔧 unsaved dialog + beforeunload | fix fase 11 |
| Sync post-save | 🔧 `queryClient` in persist/remove | fix fase 11 |
| Multi-tab | Realtime + broadcast | ⚠️ last-write-wins JSONB |

### Promemoria dashboard
| Op | Meccanismo | Rischio |
|----|------------|---------|
| CRUD | form modal + service mutations | Basso |
| Validazione titolo | client trim + toast | ✅ |
| Unsaved on close | — | 📋 backlog minore |

---

## Findings e fix

### P11-001 — BUNDER editor chiude senza conferma

| | |
|---|---|
| **Severità** | P1 |
| **Problema** | `onRequestClose` chiudeva subito perdendo modifiche locali. |
| **Fix** | 🔧 `GestionaleUnsavedChangesDialog` + `isBunderDocumentDirty` + `useBeforeUnloadWhenDirty`. |

### P11-002 — BUNDER save senza sync dispatch

| | |
|---|---|
| **Severità** | P1 |
| **Problema** | `persistBunderDocument` / `removeBunderDocument` chiamati senza `queryClient` → no cross-tab invalidation. |
| **Fix** | 🔧 `useQueryClient` in `bunder-view.tsx`. |

### P11-003 — Documenti upload orphan file

| | |
|---|---|
| **Severità** | P2 |
| **Stato** | ⚠️ documentato fase 4/5 — no job cleanup |
| **Azione** | 📋 backlog compensating transaction / cleanup job |

### P11-004 — Promemoria modal no unsaved guard

| | |
|---|---|
| **Severità** | P3 |
| **Stato** | 📋 form piccolo; perdita limitata |

### P11-005 — Hook beforeunload duplicato

| | |
|---|---|
| **Severità** | P3 |
| **Stato** | 🔧 introdotto `lib/forms/use-before-unload-when-dirty.ts`; impostazioni/security restano inline (ok) |

---

## Fix applicati (fase 11)

| ID | File |
|----|------|
| P11-001 | `components/bunder/bunder-editor-modal.tsx` |
| P11-001 | `lib/bunder/bunder-document-dirty.ts` |
| P11-001 | `lib/forms/use-before-unload-when-dirty.ts` |
| P11-002 | `components/bunder/bunder-view.tsx` |
| CI | `lib/bunder/bunder-document-dirty.test.ts` |
| CI | `lib/regression/forms-save-policy.test.ts` |

---

## Checklist verifica manuale

| # | Scenario | Pass atteso |
|---|----------|-------------|
| 1 | BUNDER editor: modifica campo → chiudi X | Dialog unsaved |
| 2 | BUNDER: Salva ed esci | Persist DB + chiude |
| 3 | BUNDER tab A salva, tab B su lista | Lista B aggiornata |
| 4 | Timesheet: edit cella → refresh rapido | Dati persistiti (flush) |
| 5 | Impostazioni dirty → refresh browser | Prompt browser |
| 6 | Preventivi editor dirty → Esci | Unsaved dialog |
| 7 | Documenti upload fail | Modale aperta + errore |

---

## Verifica automatica

```bash
npm run ci:tsc
npx tsx lib/bunder/bunder-document-dirty.test.ts
npx tsx lib/documenti/documenti-form-validation.test.ts
npx tsx lib/dipendenti/timesheet-validation.test.ts
npx tsx lib/regression/forms-save-policy.test.ts
npm run smoke:regression
```

---

## Riferimenti codice

| Area | Path |
|------|------|
| Unsaved dialog | `components/gestionale/gestionale-unsaved-changes-dialog.tsx` |
| Confirm | `src/hooks/use-gestionale-confirm.tsx` |
| Before unload hook | `lib/forms/use-before-unload-when-dirty.ts` |
| BUNDER dirty | `lib/bunder/bunder-document-dirty.ts` |
| Timesheet flush | `src/hooks/use-dipendenti-timesheet.ts` |
| Impostazioni bulk | `components/dashboard/sistema-impostazioni-modal.tsx` |
| Documenti validation | `lib/documenti/documenti-form-validation.ts` |

---

## Documenti audit per fase

| Fase | Documento |
|------|-----------|
| 2–10 | vedi fasi precedenti |
| 11 | questo documento |
