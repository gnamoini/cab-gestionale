# UX Enforcement Layer

Obiettivo: prevenire regressioni UX e rendere obbligatori:

- `useGestionaleToast()`
- `useGestionaleConfirm()`
- error handling humanizzato

## Regole

Vietato usare direttamente:

- `window.alert`
- `window.confirm`
- `window.prompt`
- `useToast()` fuori dai file infrastrutturali consentiti

## Enforcement attivo

### 1) Runtime guard (dev mode)

`DevUxEnforcementGuard` intercetta API legacy browser:

- `window.alert` -> warning console + blocco chiamata
- `window.confirm` -> warning console + ritorna `false`
- `window.prompt` -> warning console + ritorna `null`

`context/toast-context.tsx` emette warning quando:

- `useToast()` è chiamato fuori allowlist
- viene inviato un toast `error` con testo tecnico/non humanizzato

### 2) ESLint enforcement

`eslint.config.mjs` blocca:

- proprietà `window.alert|confirm|prompt`
- import `useToast` da `@/context/toast-context` (eccetto allowlist)

### 3) CI/static check

Script:

```bash
npm run ux:enforce
```

Scansiona il codebase e fallisce se trova:

- API browser legacy
- `useToast()` fuori allowlist

## Helper obbligatori consigliati

- `useGestionaleToast()` per tutti i feedback utente
- `useGestionaleConfirm()` per conferme UX
- `runGestionaleAction(...)` (`src/lib/ux/gestionale-action-helpers.ts`) per nuove mutation con pattern success/error unico

## Note operative

- Non usare questo layer per modificare UI esistente automaticamente.
- Usarlo per bloccare nuove regressioni in sviluppo e CI.
