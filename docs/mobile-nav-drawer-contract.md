# Mobile Nav Drawer — Interaction Contract

SSOT comportamentale per `MobileNavDrawer`. La state machine in `lib/ui/mobile-nav-drawer-machine.ts` implementa questo contratto.

## Soglie

| Costante | Valore |
|----------|--------|
| `OPEN_RATIO` | 0.3 (30% larghezza pannello) |
| `VELOCITY_COMMIT_PX_MS` | 0.45 px/ms |
| `EDGE_ZONE_PX` | 24 + safe-area-left (no viewport %) |
| `GESTURE_START_PX` | 10 |
| `DIRECTION_RATIO` | 1.2 |
| `TAP_THRESHOLD_PX` | 8 |
| `ANIMATION_MS` | 240 |
| `WATCHDOG_MS` | 320 (240 + 80) |
| `EDGE_DRAG_IDLE_MS` | 400 (recovery pointer perso su PWA Android) |
| `EDGE_PREVIEW_STUCK_MS` | 600 (`EDGE_DRAG_IDLE_MS` + 200 — recovery macchina se `DRAGGING`+`edgePreview` resta bloccato) |
| `RUBBER_BAND_MAX_PX` | 24 |

## Stati

`CLOSED` | `OPENING` | `OPEN` | `DRAGGING` | `SETTLING_OPEN` | `SETTLING_CLOSE` | `LOCKED`

## Contract table

| Evento | Stato corrente | Stato risultante | Animazione | Scroll | Focus |
|--------|----------------|------------------|------------|--------|-------|
| Tap hamburger | `CLOSED` | `OPENING` → `OPEN` | slide 240ms | lock | trap drawer |
| Tap hamburger (heal edge preview) | `DRAGGING`* | `OPENING` → `OPEN` | slide 240ms | lock | trap drawer |
| Swipe in activation zone | `CLOSED` | `DRAGGING` | realtime transform | lock on first move | unchanged |
| Swipe release (commit) | `DRAGGING` | `SETTLING_OPEN` → `OPEN` | settled (no re-animate) | lock | trap on `OPEN` |
| Swipe release (cancel) | `DRAGGING` | `SETTLING_CLOSE` → `CLOSED` | snap-back 240ms | unlock on unmount | restore hamburger |
| Swipe dismiss (commit) | `OPEN` / `DRAGGING` | `SETTLING_CLOSE` → `CLOSED` | slide-out | unlock | restore hamburger |
| Tap backdrop | `OPEN` / `DRAGGING`* | `SETTLING_CLOSE` → `CLOSED` | slide + fade | unlock | restore hamburger |
| ESC | `OPEN` | `SETTLING_CLOSE` → `CLOSED` | slide | unlock | restore hamburger |
| Browser/hardware back | `OPEN` | `SETTLING_CLOSE` → `CLOSED` | slide | unlock | unchanged |
| Click nav link | `OPEN` | `LOCKED` → `CLOSED` | close immediato | unlock | page |
| Pathname change | any non-`CLOSED` | `LOCKED` → `CLOSED` | close | unlock + heal | page |
| `pointercancel` / `touchcancel` | `DRAGGING` | snap o close per progress | dipende | heal | unchanged o restore |
| `visibilitychange` hidden | any non-`CLOSED` | `FORCE_CLOSE` → `CLOSED` | none (instant) | unlock + heal | unchanged |
| Resize mid-drag | `DRAGGING` | cancel → stable state | reset transform | heal | unchanged |
| Tier → desktop | any | `FORCE_CLOSE` → `CLOSED` | none | unlock | unchanged |
| `prefers-reduced-motion` | any | stessi stati | 1ms | invariato | invariato |

\* Backdrop tap durante `DRAGGING` con progress > 0: chiude. Tap hamburger durante `DRAGGING` con `edgePreview`: apre (heal stato parziale).

## Invarianti

1. Un solo stato dominante — mai `OPEN` e `CLOSED` simultanei nel DOM interattivo.
2. Scroll lock ⊆ mounted — lock attivo iff drawer montato.
3. Back handler ⊆ scroll lock — allineati per tutta la durata mounted.
4. Transform obsolete = 0 — dopo `CLOSED`, nessun inline transform/opacity residuo.
5. Focus restore ≤ 1 — un solo target (hamburger).
6. Gesture owner unico — arbitration decide chi gestisce.

## Gesture arbitration priority

1. Modal / Confirm / Unsaved
2. Mobile Nav Drawer (OPEN o DRAGGING)
3. Filter drawer / bottom sheet
4. Draggable / kanban
5. Horizontal scroll
6. Page vertical scroll

## Event ordering guarantees

- `OPEN_REQUEST` durante `OPENING`/`LOCKED` → ignorato (idempotente).
- `OPEN_REQUEST` durante `DRAGGING` con `edgePreview` → heal → `OPENING` (hamburger recovery).
- `CLOSE_REQUEST` durante `SETTLING_CLOSE` → ignorato.
- Watchdog scatta su `SETTLING_*` se `animationend`/`transitionend` mancante → `FORCE_CLOSE` + metric `drawer_stuck_recovered`.
- `DRAGGING` + `edgePreview` senza transizione entro `EDGE_PREVIEW_STUCK_MS` → `POINTER_CANCEL` (recovery stato bloccato).
- `setPointerCapture` su `document.body`: `lostpointercapture` sui figli (bubble) va ignorato; abort solo se `event.target === document.body`.
- Cleanup idempotente: doppia chiamata non double-unlock.

## Telemetry

| Metric | Quando |
|--------|--------|
| `drawer_open` | `OPEN` raggiunto |
| `drawer_close` | `CLOSED` |
| `drawer_cancel` | edge swipe cancel |
| `drawer_snap_back` | dismiss sotto soglia |
| `drawer_velocity_commit` | commit via velocity |
| `drawer_force_close` | visibility / tier / route |
| `drawer_stuck_recovered` | watchdog |
| `drawer_pointer_cancel` | pointercancel |
| `drawer_resize_recovery` | resize mid-drag |
