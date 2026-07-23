import type { PointerEvent } from "react";

/** Dopo tap/click toglie focus residuo (arancione). L'attivazione da tastiera non emette pointerup. */
export function blurShellNavAfterPointer(event: PointerEvent<HTMLElement>) {
  const el = event.currentTarget;
  requestAnimationFrame(() => {
    if (document.activeElement === el) el.blur();
  });
}
