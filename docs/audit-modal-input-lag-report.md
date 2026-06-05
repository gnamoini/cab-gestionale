# Audit input lag modali gestionale

Data: 2026-06-05  
**Nota (2026-06):** i file probe `lib/debug/*` (sessione `929eab`) sono stati **rimossi** dal runtime. Questo report resta come storico dei fix applicati.

## 1. Modali analizzati

| Severità | Modal | Stato audit |
|----------|-------|-------------|
| Critico | Nuovo ricambio (`magazzino-view` → `RicambioNewModal`) | Fix applicato |
| Critico | Scheda ingresso edit hub (`schede-lavorazione-modal` → `SchedaIngressoEditModal`) | Fix applicato |
| Alto | Modifica ricambio (`RicambioEditModal`) | Già isolato; subtree alleggerito |
| Alto | Nuovo/Modifica mezzo (`mezzi-view` → `MezziNewModal` / `MezziEditModal`) | Fix applicato |
| Alto | `GlobalSelect` hot path | `useDeferredValue` su suggestions/similarTo |
| Medio | `SchedaIngressoFormBody` lastIngressoMatch | Debounce 300ms su targa/matricola |
| Medio | `SchedaIngressoAnagraficaFields` | `React.memo` |

## 2. Cause root (evidenza)

### A. Parent re-render (Critico)

**Prima:** `newForm` in `magazzino-view.tsx` (~2100 righe) causava re-render tabella + log + 21 `useMemo` ad ogni keystroke.

**Dopo:** parent mantiene solo `newOpen: boolean`. Draft in `RicambioNewModal`.

**Prima:** `ingressoF` in `schede-lavorazione-modal.tsx` ri-renderizzava hub + feed ad ogni carattere.

**Dopo:** draft locale in `SchedaIngressoEditModal`; hub riceve draft solo su chiusura/salvataggio via `ingressoDraftRef`.

**Prima:** `nuovoForm` / `editForm` in `mezzi-view.tsx`.

**Dopo:** modali dedicati con stato locale.

### B. Subtree form pesante (Alto)

- `RicambioFormOptionsProvider`: un solo `useGlobalOptions` per form + compat + fornitori (era 3×).
- `RicambioFornitoriAlternativiEditor`: `memo` con comparatore su `rows`.
- `RicambioFormCompatSection`: già `memo` (invariato).

### C. GlobalSelect per-keystroke (Alto)

`useDeferredValue(searchText)` per `suggestions` e `findSimilarEntityInPool` — input resta sincrono, filtri/similarità deferiti al frame successivo.

### D. Validazione inline (Medio)

`findDuplicateByCodici` in `RicambioNewModal` con debounce 400ms su codici OE (non più per keystroke nel parent).

## 3. Render count attesi (per keystroke campo testo)

| Scenario | Parent view (prima) | Parent view (dopo) | Modal/form (dopo) |
|----------|--------------------|--------------------|-------------------|
| Nuovo ricambio — descrizione | 1+ (`MagazzinoView`) | **0** | 1 (`RicambioNewModal` + form) |
| Modifica ricambio — descrizione | 0 (già isolato) | 0 | 1 |
| Scheda ingresso hub — cliente | 1+ (`SchedeLavorazioneModal`) | **0** | 1 (`SchedaIngressoEditModal`) |
| Nuovo mezzo — cliente | 1+ (`MezziView`) | **0** | 1 (`MezziNewModal`) |

Verifica manuale consigliata: React DevTools Profiler, record 10 caratteri, confrontare commit `*View` vs modal.

## 4. Ottimizzazioni applicate (file)

| File | Modifica |
|------|----------|
| `components/gestionale/magazzino/ricambio-new-modal.tsx` | Nuovo — draft isolato, debounce duplicati |
| `components/gestionale/magazzino/ricambio-form-options-context.tsx` | Provider opzioni unico |
| `components/gestionale/magazzino/magazzino-view.tsx` | Rimosso `newForm`; monta `RicambioNewModal` |
| `components/gestionale/magazzino/ricambio-edit-modal.tsx` | `RicambioFormOptionsProvider` |
| `components/gestionale/magazzino/ricambio-form-fields.tsx` | `useRicambioFormOptions` |
| `components/gestionale/magazzino/ricambio-form-compat-section.tsx` | `useRicambioFormOptions` |
| `components/gestionale/magazzino/ricambio-fornitori-alternativi-editor.tsx` | context + `memo` |
| `components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx` | Draft locale edit modal; debounce ident |
| `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | Rimosso `ingressoF` controllato |
| `components/gestionale/mezzi/mezzi-new-modal.tsx` | Nuovo |
| `components/gestionale/mezzi/mezzi-edit-modal.tsx` | Nuovo |
| `components/gestionale/mezzi/mezzi-form-fields.tsx` | Form estratto |
| `components/gestionale/mezzi/mezzi-view.tsx` | Solo boolean + id mezzo edit |
| `components/gestionale/global-input/global-select.tsx` | `useDeferredValue` |
| `components/gestionale/schede/scheda-ingresso-anagrafica-fields.tsx` | `memo` |
| ~~`lib/debug/modal-input-lag-probe.ts`~~ | Rimosso post-audit (probe non più presente) |

## 5. Regressioni verificate

- [x] `npx tsx lib/ui/mobile-modal-behavior.test.ts` (scroll/focus mobile modali) — OK
- [ ] Manuale: apertura/chiusura/ESC modali toccati
- [ ] Manuale: salvataggio + validazione liste (marca, categoria, compat)
- [ ] Manuale: unsaved changes dialog scheda ingresso hub
- [ ] Manuale: immagini draft nuovo ricambio
- [ ] Manuale: permessi read-only

## 6. Probe debug

**Stato:** probe `lib/debug/*` e ingest HTTP sessione `929eab` **rimossi** (2026-06). Diagnostica dev locale disponibile via `npm run dev:lag-probe` / `dev:cpu-probe` → `dev-probe.log` (solo file locale, nessun ingest esterno).

## 7. Classificazione issue residui

| Issue | Severità | Note |
|-------|----------|------|
| `LavorazioneCreateModal` — `useGlobalOptions` sempre on | Medio | Stato già isolato nel modal; impatto minore |
| `sistema-impostazioni-modal` form inline | Medio | Non in scope tier-1 |
| Split memo sezioni identificazione/prezzi ricambio | Basso | Context + fornitori memo coprono il grosso |
