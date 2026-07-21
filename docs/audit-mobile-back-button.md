# Audit: pulsante Indietro con modal aperti

Data: 2026-06-05 (aggiornato 2026-07-21)

## Strategia implementata (v2)

### History API + stack con ownership

All'apertura overlay:

```ts
history.pushState({
  cabOverlay: true,
  overlayId,
  overlayOwner: "overlay-back-stack",
  createdAt,
}, "", sameUrl)
```

Chiusura programmatica (X, Salva): `history.back()` con `suppressedPopCount++` **solo se** `isOwnedOverlayHistoryEntry(state, overlayId)`; altrimenti `replaceState` fallback.

`popstate` soppresso tramite **contatore** `suppressedPopCount` (non boolean) per overlay annidati.

### Priorità overlay (non LIFO puro)

| Layer | Priority | blocksGestures |
|-------|----------|----------------|
| navigation | 100 | sì |
| drawer | 200 | sì |
| modal | 300 | sì |
| selector | 350 | no |
| confirm | 400 | sì |

Indietro chiude: **priorità più alta**, a parità **ultimo aperto**.

### Middleware `beforeBack`

`useOverlayBackHandler` accetta `beforeBack` per dirty/permessi/validazione. Se intercetta back da `popstate`, `ensureOverlayBackResync` ripristina la voce history.

### Confirm `pending`

Overlay **sempre registrato**; handler no-op se `pending` (non rimuovere dallo stack).

## File SSOT

| File | Ruolo |
|------|-------|
| `lib/ui/overlay-back-stack.ts` | Stack, ownership, suppress counter, layer priority |
| `lib/ui/use-overlay-back-handler.ts` | Hook React + `beforeBack` + `useIsomorphicLayoutEffect` |
| `lib/ui/overlay-back-stack-guard.tsx` | Listener `popstate` singleton |

## Test automatici

- `lib/ui/overlay-back-stack.test.ts` — priority, ownership, suppress counter, legacy heal
- `lib/ui/use-pull-to-refresh.test.ts` — wiring PTR compact shell + scrollport

## Checklist manuale

- [ ] Android Chrome: back chiude modal senza cambiare pagina
- [ ] iOS Safari: swipe-back chiude overlay
- [ ] Modal dirty → back → conferma; secondo back non naviga via
- [ ] Wizard: back = step precedente quando `onBack` definito
- [ ] PTR su tablet compatto + telefono
