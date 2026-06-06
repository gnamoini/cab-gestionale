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

Z-index: base `z-[100]`, stacked `z-[110]`, confirm `z-[120]` (`lib/ui/mobile-modal-behavior.ts`).

## Checklist nuovo modale

1. Scegliere `modalSize` dalla tabella.
2. Usare `GestionaleModalShell` + `GestionaleModalScrollBody`.
3. Non usare `max-w-*` ad hoc sulla shell (audit in `lib/regression/modal-width-audit.test.ts`).
4. Conferme → `GestionaleConfirmDialog` o `useGestionaleConfirm`.
