# Bootstrap e hydration

## Mismatch da estensioni browser (causa esterna)

Se in console compaiono warning di hydration con attributi come:

- `bis_skin_checked`, `bis_register`, `data-bis-config`
- `data-cursor-ref` su link, bottoni e testi della sidebar (anteprima / automazione **Cursor Browser**)
- prefissi `chrome-extension://` nello stack o nel DOM

la causa è quasi sempre un’**estensione** o il **browser integrato dell’IDE** che modifica il DOM **prima** che React idrati. Non è un bug dell’app (`data-cursor-ref` non esiste nel repository).

**Come verificare**

1. Finestra in incognito senza estensioni, oppure disabilitare le estensioni sul sito.
2. Ricaricare: i warning su attributi `bis_*` dovrebbero sparire.

**Mitigazione in app**

- [`app/layout.tsx`](../app/layout.tsx): `suppressHydrationWarning` su `<html>`, `<head>`, `<body>`; script `cab-theme-boot` in `<head>` via `next/script` `beforeInteractive`.
- Script blocking in [`lib/theme/theme-boot-inline-script.ts`](../lib/theme/theme-boot-inline-script.ts) applica tema prima dell’hydration.

`suppressHydrationWarning` su `<body>` copre solo attributi del body (es. `bis_register`), non i discendenti. I warning su `bis_skin_checked` nei `<div>` interni spariscono solo disabilitando l'estensione.

## Mismatch interni (codice)

Pattern da evitare nel render iniziale:

| Pattern | Fix |
|---------|-----|
| `localStorage` / `sessionStorage` in `useState(() => load…())` | Init valore vuoto SSR-safe; `useEffect` per hydrate |
| `Date.now()` / `new Date()` per UI “oggi” | `mounted` + calcolo dopo mount |
| `Math.random()` in render | Solo in callback / effect |

View già allineate: `ThemeToggle`, `DashboardWelcome`, sidebar collapse (`useSidebarCollapsed` / `useSyncExternalStore`), `useUndoSessionId` (`useSyncExternalStore`).

## Theme SSR vs client

SSR imposta `dark` su `<html>`. Lo script in `<head>` riallinea `class` e `colorScheme` da `localStorage` prima del paint. Eventuale differenza è intenzionale e coperta da `suppressHydrationWarning` su `<html>`.

Dopo il mount, `ThemeProvider` imposta `document.documentElement.dataset.ready = "1"` (segnale opzionale per CSS/diagnostica). **Non** spostare lo script tema su `afterInteractive`: reintrodurrebbe flash FOUC.

## Auth bootstrap (single source of truth)

| Layer | Comportamento |
|-------|----------------|
| `getServerSession()` | Una risoluzione auth per request RSC (`React.cache` + cache modulo TTL 45s) |
| `proxy.ts` | `resolveServerAuthWithSupabase` — `getUser` per refresh cookie; profilo/permessi da cache |
| `AuthProvider` | `initialSnapshot` da root layout → stato `authenticated` senza `getSession` al mount |
| `GestionaleAuthGate` | Shell-first: banner nel main, non blocco full-page |

**Verifica (Network):** su navigazione gestionale autenticata, al primo paint non dovrebbe comparire un `getSession` client ridondante se lo snapshot server è fresco; resta la subscription `onAuthStateChange`.

Timing opzionale: `NEXT_PUBLIC_BOOT_TIMING=1` nei log del proxy.

## iOS Safari / mobile stability

| Area | Mitigazione |
|------|-------------|
| Viewport dinamico | `min-h-dvh`, `--cab-vv-height` da Visual Viewport API |
| Safe area | `env(safe-area-inset-*)` su header, main, modali |
| Zoom input | `text-base` (≥16px) su mobile in `dsInput` + regola CSS globale |
| Scroll lock modali | `useBodyScrollLock` con `position: fixed` su iOS |
| Overflow orizzontale | `overflow-x: clip` su `html`/`body`, shell `max-w-[100vw]` |
| Focus tastiera | `IosInteractionStability` → `scrollIntoView({ block: 'nearest' })` |

Check statico: `npm run ios:check`
