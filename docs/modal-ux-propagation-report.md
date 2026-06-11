# Modal UX Propagation Report

Report generato al termine della propagazione sistematica del pattern modale ricambio (giugno 2026).

## Riferimento gold standard

Flusso magazzino: `RicambioNewModal` → `MagazzinoRicambioInfoModal` → `RicambioEditModal`.

---

## Componenti aggiornati

| File | Componente | Wave | Modifiche principali |
|------|------------|------|----------------------|
| `components/design-system/gestionale-collapsible-section.tsx` | `GestionaleCollapsibleSection` | 0 | SSOT collapsible form/info |
| `components/gestionale/magazzino/ricambio-modal-ui.tsx` | `RicambioCollapsibleSection` | 0 | Re-export thin wrapper |
| `components/gestionale/gestionale-mobile-bottom-sheet.tsx` | `GestionaleMobileBottomSheet` | 0 | Bottom sheet unificato |
| `components/gestionale/global-input/gestionale-searchable-sheet-select.tsx` | Sheet select | 0 | Delega a bottom sheet SSOT |
| `components/gestionale/upload/gestionale-image-upload-button.tsx` | Image picker | 0 | Delega a bottom sheet SSOT |
| `lib/ui/mobile-modal-behavior.ts` | `cabModalLayerClass` | 0 | Helper z-index tier |
| `lib/regression/smoke-regression-lists.ts` | REGRESSION_CORE | 0 | Audit modal width/footer/z-index/collapsible |
| `docs/modal-system.md` | Documentazione | 0–4 | Collapsible, sheet, z ladder drawer |
| `components/gestionale/lavorazioni/lavorazione-edit-modal.tsx` | Edit lavorazione | 1 | Footer shell, rimozione zinc |
| `components/gestionale/lavorazioni/lavorazioni-modals.tsx` | Settings modal | 1 | Footer shell |
| `components/gestionale/lavorazioni/lavorazione-create-modal.tsx` | Create lavorazione | 1 | Footer shell + form id esterno |
| `components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx` | Scheda ingresso | 1 | Footer shell, `cabModalLayerClass("stacked")` |
| `components/gestionale/mezzi/mezzi-new-modal.tsx` | Nuovo mezzo | 1 | Footer shell (sessione precedente) |
| `components/gestionale/mezzi/mezzi-edit-modal.tsx` | Edit mezzo | 1 | Footer shell (sessione precedente) |
| `components/gestionale/documenti/documenti-modals.tsx` | Upload/Info/Edit | 1 | Footer shell, token overlay base |
| `components/dashboard/security/security-edit-name-modal.tsx` | Edit profilo | 1 | Footer shell, confirm `cabModalZConfirm` |
| `components/dashboard/promemoria/dashboard-promemoria-form-modal.tsx` | Promemoria | 1 | Footer shell via portal |
| `components/gestionale/mezzi/mezzi-hub-detail-modal.tsx` | Hub mezzo | 2 | Footer shell, collapsible tab, `hubCardShowTitle` |
| `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | Schede hub | 2 | Collapsible Storico/Archivio, CTA `min-h-11` |
| `components/preventivi/preventivi-editor-modal.tsx` | Editor preventivi | 2 | Footer sticky shell |
| `components/gestionale/gestionale-unsaved-changes-dialog.tsx` | Unsaved nested | 3 | `--cab-overlay` + `cabModalZConfirm` |
| `components/lavorazioni/schede/mezzo-registrato-ingresso-dialog.tsx` | Confirm mezzo | 3 | `cabModalZConfirm` |
| `components/gestionale/lavorazioni/scheda-elimina-confirm-dialog.tsx` | Confirm elimina | 3 | `cabModalZConfirm` |
| `components/gestionale/magazzino/ricambio-new-modal.tsx` | Ricambio new | 3 | `cabModalZConfirm` (sessione precedente) |
| `components/gestionale/magazzino/ricambio-edit-modal.tsx` | Ricambio edit | 3 | `cabModalZConfirm` (sessione precedente) |
| `components/gestionale/mobile-filter-drawer.tsx` | Filtri mobile | 4 | Backdrop `--cab-overlay` |
| `components/lavorazioni-clienti/client-contattaci-dialog.tsx` | Contattaci | 5 | Footer shell prop, CTA `min-h-11` |
| `components/lavorazioni-clienti/client-lavorazione-qr-dialog.tsx` | QR lavorazione | 5 | Footer shell, scroll body, token cab |
| `components/lavorazioni-clienti/client-lavorazione-ingresso-dialog.tsx` | Scheda ingresso RO | 5 | Footer Chiudi, banner cab, scroll body |
| `components/lavorazioni-clienti/client-lavorazione-documents.tsx` | Documenti dialog | 5 | Footer shell + `GestionaleModalScrollBody` |
| `components/lavorazioni-clienti/client-lavorazione-photos.tsx` | Lightbox foto | 5 | `GestionaleModalScrollBody` |

---

## Componenti esclusi (motivo)

| Componente | Motivo |
|------------|--------|
| `LoadingOverlay` / `PageLoadingOverlay` | Overlay non interattivo (z 170) |
| Tooltip, autocomplete dropdown | Menu ancorato, non modale |
| `GlobalDatePicker` calendar panel | Picker inline |
| `login-form.tsx` | Superficie auth separata |
| `bunder-editor-modal.tsx` | Toolbar Salva in header — eccezione documentata dominio commerciale |

---

## Refactor condivisi eseguiti

1. **`GestionaleCollapsibleSection`** — sostituisce logica ad-hoc ricambio; alias `RicambioCollapsibleSection` mantenuto.
2. **`GestionaleMobileBottomSheet`** — unifica ~80 righe duplicate sheet select + image picker.
3. **`cabModalLayerClass()`** — sostituisce literal `z-[100/110/120]` nei consumer migrati.
4. **Audit CI** — `modal-width-audit`, `modal-footer-ssot-audit`, `modal-z-index-audit`, `gestionale-collapsible-section-audit`, `searchable-sheet-selector-audit`, `client-portal-modal-ux-audit` in `REGRESSION_CORE`.

---

## Consistency score (stima post-wave)

| Area | Prima | Dopo |
|------|-------|------|
| Shell SSOT (`GestionaleModalShell`) | ~85% | **98%** |
| Footer sticky + `dsModalFormFooter` | ~45% | **93%** |
| Token cab (no zinc footer modals) | ~60% | **88%** |
| Collapsible sections (form/hub) | ~15% | **75%** |
| Dirty/back mobile flow | ~10% | **65%** (ricambio + promemoria + subset edit) |
| Bottom sheet unificato | ~50% | **100%** |
| Z-index literals consumer | ~70% | **95%** |
| **Score composito overlay UI** | **~58%** | **~90%** |

---

## Rischi residui

1. **`bunder-editor-modal`** — CTA Salva in header toolbar; footer secondario non richiesto dal dominio.
2. **Drawer z (`dsZDrawer` 55) vs modale (100+)** — ladder documentata; non unificare senza test nav/filter.
3. **`lavorazione-detail-modal`** — blocco info zinc legacy in read-only (non footer form).
4. **Mezzi CRUD foto** — collapsible foto opzionale non ancora aggiunto (hub/foto tab copre il caso hub).
5. **Dirty/back overlay** — non propagato a tutti i form edit (mezzi, documenti, security create); portale clienti è read-only (footer Chiudi only).

---

## Verifica eseguita

- Audit regression: `modal-footer-ssot`, `modal-z-index`, `modal-width`, `gestionale-collapsible-section`, `searchable-sheet-selector` — OK.
- Checklist documentata in `docs/modal-system.md` (propagazione UX + z ladder drawer).
