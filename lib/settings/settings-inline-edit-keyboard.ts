import type { KeyboardEvent } from "react";

/** Enter: commit via blur; Escape: ripristina valore iniziale ed esce da edit. */
export function handleSettingsInlineEditKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  initialValue: string,
  onExitEdit?: () => void,
): void {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.value = initialValue;
    onExitEdit?.();
  }
}

/** Enter su campo “aggiungi” — evita submit form. */
export function handleSettingsAddRowEnter(e: KeyboardEvent<HTMLInputElement>, onAdd: () => void): void {
  if (e.key !== "Enter") return;
  e.preventDefault();
  e.stopPropagation();
  onAdd();
}
