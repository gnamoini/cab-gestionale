# Sistema modali gestionale

## Architettura

```
modal-size-system.ts (SSOT)
    ├── resolveModalWidthClasses(modalSize)
    ├── resolveModalHeightClasses(modalHeight)
    ├── resolveShellModalLayout({ modalSize, modalHeight })
    └── resolveDrawerAsideClasses(drawerSize)

GestionaleModalShell / LavorazioniModalShell
GestionaleConfirmDialog (confirmation width)
Drawer / MobileFilterDrawer / MobileNavDrawer
```

Modificare una dimensione globalmente: aggiornare `--cab-modal-width-*` in `app/globals.css` oppure le costanti in `lib/ui/modal-size-system.ts`.

Esempio — allargare tutti i form large:

```css
.cab-app-shell {
  --cab-modal-width-form-large: 62rem; /* era 56rem */
}
```

## ModalSize

| `modalSize` | Desktop width | Altezza default | Casi d'uso |
|-------------|---------------|-----------------|------------|
| `confirmation` | 28rem | auto | Conferme, unsaved stacked (`GestionaleConfirmDialog`) |
| `info` | 32rem | compact | QR, dettagli read-only, lightbox leggeri |
| `formSmall` | 36rem | compact | Promemoria, edit profilo, timesheet |
| `formMedium` | 48rem | standard | CRUD standard (ricambi, mezzi, documenti) |
| `formLarge` | 56rem | standard | Hub schede, editor preventivi/BUNDER, settings |
| `analytics` | 64rem | tall | Report storico manuale |
| `fullscreen` | 100% | standard | Anteprima foto (overlay scuro) |

## Drawer

| `drawerSize` | Larghezza | Uso |
|--------------|-----------|-----|
| `drawerLog` | 28rem | Log modifiche (`Drawer`) |
| `drawerFilter` | 22rem | Filtri mobile |
| `drawerNav` | min(19.5rem, 88vw) | Menu mobile |

## Shell — uso

```tsx
<GestionaleModalShell
  modalSize="formLarge"
  modalHeight="standard" // opzionale
  onRequestClose={onClose}
  title="Titolo"
  footer={<Actions />}
>
  <GestionaleModalScrollBody>{content}</GestionaleModalScrollBody>
</GestionaleModalShell>
```

## Header / footer

- **Header**: `LavorazioniModalHeader` — titolo, sottotitolo opzionale, `CloseButton` con `aria-label="Chiudi"`.
- **Form footer**: `dsModalFormFooter` — Annulla (secondary) · Salva (primary).
- **Confirm footer**: `gestionaleConfirmActionsClass` — fuori dal body scrollabile.

## Responsive

- **Mobile (`< md`)**: shell form = fullscreen edge-to-edge; confirm = card centrata.
- **Desktop**: larghezza da `modalSize`; scroll nel body (`data-cab-modal-scroll`).

## Nested modals

Z-index SSOT: `cabModalLayerClass("base"|"stacked"|"confirm")` o costanti `cabModalZBase` (100), `cabModalZStacked` (110), `cabModalZConfirm` (120) in `lib/ui/mobile-modal-behavior.ts`. Evitare literal `z-[120]` nei consumer.

## Sezioni collapsible (form)

- **SSOT:** `GestionaleCollapsibleSection` in `components/design-system/gestionale-collapsible-section.tsx`
- Variante `form`: shell surface 35% (modali CRUD ricambio/mezzi/…)
- Alias dominio magazzino: `RicambioCollapsibleSection` in `ricambio-modal-ui.tsx`
- Espansione istantanea (`grid-rows`), chevron pill, scroll-into-view su expand mobile

## Bottom sheet mobile

- **SSOT:** `GestionaleMobileBottomSheet` in `components/gestionale/gestionale-mobile-bottom-sheet.tsx`
- Backdrop: `bg-[var(--cab-overlay)]`; z: `cabModalLayerClass("stacked")`
- Usato da `GestionaleSearchableSheetSelect` e picker foto mobile

## Drawer e filtri (z ladder)

| Layer | Token / costante | Valore | Uso |
|-------|------------------|--------|-----|
| Nav / filtri | `dsZDrawer` | 55 | Menu mobile (`app-shell`), `mobile-filter-drawer` |
| Modale base | `cabModalZBase` | 100 | `GestionaleModalShell`, documenti, CRUD |
| Modale stacked | `cabModalZStacked` | 110 | Scheda ingresso edit sopra hub, picker sheet |
| Confirm nested | `cabModalZConfirm` | 120 | `GestionaleConfirmDialog`, unsaved nested |

**Nota:** non unificare `dsZDrawer` con modali senza regression test nav/filter. Backdrop drawer/filtri: `bg-[var(--cab-overlay)]` (allineato ai modali).

## Propagazione UX (checklist)

1. Footer sticky via prop `footer` shell — non `border-zinc-200 bg-white` inline
2. `min-h-11` su CTA form mobile
3. Dirty exit: `useBeforeUnloadWhenDirty` + `GestionaleConfirmDialog` + `cabModalZConfirm`
4. Back mobile: `ensureOverlayBackResync` quando form dirty
5. Foto: `RecordImageManager hubCardLayout` + titolo collapsible o `hubCardShowTitle`
6. Card mobile liste: `CardMobile` + `mt-auto` footer + `h-full` in grid

## Portale clienti (`/lavorazioni-clienti`)

Stessa shell gestionale (`LavorazioniModalShell` / `SchedaIngressoFormModalShell`), con eccezioni UX:

- **Contattaci:** header custom senza X (chiusura solo footer) — audit `client-portal-contattaci-audit.test.ts`
- **Ingresso / documenti / QR / foto:** footer sticky via prop `footer`, corpo `GestionaleModalScrollBody`, token `--cab-border` (no zinc footer)
- Superficie read-only: niente dirty guard; CTA footer tipicamente «Chiudi» o link nativi (`tel:`, `mailto:`)

Audit: `lib/regression/client-portal-modal-ux-audit.test.ts`

## Checklist nuovo modale

1. Scegliere `modalSize` dalla tabella.
2. Usare `GestionaleModalShell` + `GestionaleModalScrollBody`.
3. Non usare `max-w-*` ad hoc sulla shell (audit in `lib/regression/modal-width-audit.test.ts`).
4. Conferme → `GestionaleConfirmDialog` o `useGestionaleConfirm`.
