# Audit completo modal Impostazioni

**Data:** 2026-06-09  
**Scope:** pagina `/impostazioni` — overlay, dialog, drawer, toolbar save, flussi rename/delete/unsaved  
**SSOT workspace:** [`components/dashboard/settings/settings-workspace-shell.tsx`](../components/dashboard/settings/settings-workspace-shell.tsx)

---

## Inventario modal

| # | Componente | File | Trigger | RBAC | Dati | Servizi / mutation | Invalidate |
|---|------------|------|---------|------|------|-------------------|------------|
| 1 | **Drawer log** | `settings-workspace-shell.tsx`, `drawer.tsx` | Toolbar «Storico modifiche» | `manageSettings` | Log configurazione (localStorage) | `ConfigurazioneLogListEmbedded` read-only | — |
| 2 | **SettingsEliminaConfirmDialog** (workspace) | `settings-elimina-confirm-dialog.tsx` | Delete stato/addetto (sezioni lavorazioni) | `manageSettings` | Stati/addetti in state locale | Rimozione locale → bulk save | `QK.settings` al save |
| 3 | **SettingsEliminaConfirmDialog** (liste) | Istanze in `settings-unified-string-list`, `settings-clienti-list`, `settings-magazzino-marche-list`, `hierarchy-tree-settings-section` | Riga Elimina | `manageSettings` | Stringhe / marche / clienti / gerarchie | Locale fino a Salva | Idem |
| 4 | **SettingsSimileConfirmDialog** | `use-settings-similar-gate.tsx` | Add/rename con duplicato simile | `manageSettings` | Nome candidato | Callback locale | — |
| 5 | **SettingsRinominaPropagaDialog** | `settings-rinomina-propaga-dialog.tsx` | Post-save se `renameQueueRef` non vuoto | `manageSettings` | `SettingsRenameEntry[]` | Solo config / `settingsRenamePropagationService` | Propaga: `invalidateAfterSettingsRenamePropagation` |
| 6 | **GestionaleConfirmDialog** | `use-gestionale-confirm.tsx` | Undo ultimo save; Annulla modifiche | `manageSettings` | Snapshot undo / baseline | `persistSnapshot` su undo | `QK.settings` |
| 7 | **GestionaleUnsavedChangesDialog** | `gestionale-unsaved-changes-dialog.tsx` | Link interno con dirty; close modal surface | `manageSettings` | `pendingExitRef` | `saveNow` / `applySnapshot` | Come save |

**Non-modal (inline):** branding, dipendenti assenze, liste edit, lavorazioni embedded (`SettingsLavorazioniModal layout="embedded"`), parametri economici.

**Deprecated (fuori pagina):** `SistemaImpostazioniModal` + `LavorazioniModalShell` (`surface="modal"`).

**Rimosso:** card «Migrazione preventivi» (2026-06-09).

---

## Inventario pulsanti

### Toolbar pagina

| Pulsante | Handler | Loading | Errori | Successo |
|----------|---------|---------|--------|----------|
| Undo / Annulla (combo) | `undoUltimaConfigurazione` / `handleCancelChanges` | `bulkSave.isPending` disabilita | toast error undo | toast info |
| Annulla modifiche | `handleCancelChanges` | `!isDirty \|\| pending` | — | toast info + clear rename queue |
| Salva modifiche | `handleSaveNow` → `saveNow` | `aria-busy`, «Salvataggio…» | toast error save | toast success o dialog propaga |
| Storico modifiche | `setConfigLogOpen(true)` | — | — | drawer aperto |

### SettingsEliminaConfirmDialog

| Pulsante | Handler | Note |
|----------|---------|------|
| Annulla | `onCancel` | Chiude dialog |
| Elimina | `onConfirm` | Rimozione locale; nessun `pending` nelle liste (OK: sync) |

### SettingsSimileConfirmDialog

| Pulsante | Handler |
|----------|---------|
| Annulla | `onAbort` + close |
| Inserisci comunque | `onProceed` |

### SettingsRinominaPropagaDialog

| Pulsante | Handler | Loading |
|----------|---------|---------|
| Solo configurazione | `finalizePropaga(false)` | `propagaPending` |
| Propaga ovunque | `finalizePropaga(true)` | «Aggiornamento…» |

### GestionaleUnsavedChangesDialog

| Pulsante | Handler |
|----------|---------|
| Torna indietro | `handleUnsavedStay` |
| Esci senza salvare | `handleUnsavedDiscard` (+ clear rename queue) |
| Salva ed esci | `handleUnsavedSaveAndExit` |

### Branding inline

| Azione | Handler | Persistenza |
|--------|---------|-------------|
| Palette / color picker | `handlePrimaryChange` | Al Salva pagina |
| Carica logo / drag-drop | `handleFile` | Draft → `resolveBrandingForSave` |
| Rimuovi logo | `handleRemoveLogo` | Draft |
| Ripristina branding | `onResetBranding` | State locale |

---

## Pulsanti non funzionanti trovati

| Prima del fix | Dopo |
|---------------|------|
| **Dialog propaga rename non si apriva mai** dopo Salva con rename in coda (`persistSnapshot` svuotava `renameQueueRef` prima del check post-save) | **Corretto** — coda preservata fino a `finalizePropaga` |

Nessun altro dead button rilevato in code trace.

---

## Bug individuati

| ID | Severità | Descrizione | Stato |
|----|----------|-------------|-------|
| **B5** | **Alta** | `renameQueueRef` cleared in `persistSnapshot` → `SettingsRinominaPropagaDialog` mai aperto dopo rename + Salva | **Fix applicato** |
| B1 | Bassa | `dashboard-configurazione-log-separation.test.ts` stale (target file errato) | **Fix applicato** |
| B2 | Media | `settings-workspace-hook-order.test.ts` non in CI | **Fix applicato** (wire EXTENDED) |
| B3 | Media | E2E impostazioni assente | **Fix applicato** (`e2e/smoke/15-impostazioni.spec.ts`) |
| B4 | Bassa | Doc ecosystem citava migrazione preventivi UI | **Fix applicato** |

**Non bug (verificato):** addetti in-use guard attivo via `useLavorazioniAddettiInUsoQuery`; stati in-use bloccati con toast.

---

## Fix applicati

1. **`settings-workspace-shell.tsx`**
   - Rimosso `renameQueueRef.current = []` da `persistSnapshot` (coda consumata in `finalizePropaga`).
   - Clear coda su `handleCancelChanges` e `handleUnsavedDiscard`.

2. **`dashboard-configurazione-log-separation.test.ts`** — assert su `settings-workspace-shell.tsx`.

3. **`smoke-regression-lists.ts`** — aggiunti `settings-modals-audit`, `settings-workspace-hook-order`, `dashboard-configurazione-log-separation` a EXTENDED.

4. **Nuovo `lib/regression/settings-modals-audit.test.ts`**.

5. **Estesi** `forms-save-policy.test.ts`, `configurazione-inputs-audit.test.ts`.

6. **Nuovo** `e2e/smoke/15-impostazioni.spec.ts`.

7. **`docs/audit-settings-ecosystem.md`** — rimossa riga migrazione preventivi.

---

## Verifiche desktop

| Flusso | Metodo | Esito |
|--------|--------|-------|
| Handler collegati | Code trace | OK |
| Submit lock `bulkSave.isPending` | Static | OK |
| beforeunload + click interceptor cleanup | `useEffect` return | OK |
| Delete stato in uso | Toast blocco | OK (code) |
| Delete addetto in uso | Dialog con `detail` warning | OK (code) |
| Delete marca con modelli | Hierarchy `detail` modelCount | OK (code) |
| E2E save + reload costo orario | Playwright 15 | Richiede credenziali smoke |

---

## Verifiche Android

| Flusso | Metodo | Esito |
|--------|--------|-------|
| Touch target `min-h-10` / `min-h-11` | `configurazione-inputs-audit` | OK |
| `SettingsMobileSectionPicker` | Code + layout | OK (nessun modal) |
| Unsaved stacked dialog | `placement="stacked"` | OK (code) |
| Scroll sezioni | `GestionaleModalScrollBody` in nav | OK (audit esistente) |

**QA manuale device:** consigliata su checklist §11 ecosystem (non eseguita in questa sessione).

---

## Verifiche iOS

| Flusso | Metodo | Esito |
|--------|--------|-------|
| Unsaved dialog stacked | Static | OK |
| Drawer log ESC/overlay | `Drawer` component | OK (pattern condiviso) |
| Keyboard su filter/search | `GestionaleSearchField` | OK (no native select) |
| Safari submit save | — | **Checklist manuale** |

---

## Verifiche Form Engine

**Non applicabile.** Impostazioni usa snapshot + `useSettingsBulkMutation`, non Form Engine (`docs/form-engine-ssot.md`).

| Check save layer | Esito |
|------------------|-------|
| Dirty solo dopo `allHydrated` | OK |
| Logo draft in dirty | OK |
| Nessun debounce liste | OK |
| OCC via `mergeAppSettingsUpsertWithVersions` | OK |
| Rename queue post-save | OK (dopo fix B5) |

---

## Verifiche salvataggio dati

| Flusso | Mutation | Payload | Invalidate |
|--------|----------|---------|------------|
| Salva modifiche | `bulkSave.mutateAsync` | 6 righe `buildBulkRowsFromResolved` | `persistSettingsRecord` → `QK.settings` |
| Undo | `persistSnapshot` | Snapshot precedente | Idem |
| Propaga rename | `settingsRenamePropagationService` | Per kind | `invalidateAfterSettingsRenamePropagation` |
| Branding logo | `resolveBrandingForSave` + bulk | `system.branding` | Idem |

---

## Test eseguiti

```bash
node --import tsx lib/regression/settings-modals-audit.test.ts          # OK
node --import tsx lib/regression/dashboard-configurazione-log-separation.test.ts  # OK
node --import tsx lib/regression/settings-workspace-hook-order.test.ts  # OK
node --import tsx lib/regression/forms-save-policy.test.ts              # OK
node --import tsx lib/regression/configurazione-inputs-audit.test.ts    # OK
```

E2E (richiede `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD`):

```bash
npx playwright test e2e/smoke/15-impostazioni.spec.ts
```

---

## Rischi residui

| Rischio | Mitigazione |
|---------|-------------|
| Re-render monolite su keystroke liste | Debito noto; no refactor in audit |
| Propaga rename su dataset grandi | Timeout UX; monitorare in produzione |
| E2E non in CI gate senza env smoke | Documentato |
| QA iOS Safari manuale non eseguita | Checklist §11 ecosystem |
| Surface modal deprecated | Zero consumer attivi; non testata funzionalmente |

---

## Valutazione finale

| Criterio | Score | Note |
|----------|-------|------|
| Copertura inventario modal | 9/10 | Completa per pagina canonica |
| Affidabilità handler / bottoni | 9/10 | Dopo fix B5 propaga rename |
| Save layer / dati | 9/10 | Snapshot + OCC solidi |
| Test automatici | 8/10 | Regression estesa; e2e nuovo |
| Mobile / iOS | 7/10 | Static OK; device QA manuale |
| **Complessivo** | **8.5/10** | Production-ready con fix critico propaga |

---

## Regression checklist manuale (consigliata)

- [ ] Rename cliente → Salva → dialog propaga (entrambe le scelte)
- [ ] Delete stato in uso (blocco) vs addetto in uso (warning + elimina)
- [ ] Delete marca con modelli associati
- [ ] Branding: colore + logo + Salva + PDF header
- [ ] Log drawer dopo save
- [ ] Undo ultimo salvataggio (page)
- [ ] iOS Safari: unsaved + save parametri economici
