/** Conferma eliminazione elenco impostazioni — chiude dialog, toglie focus, poi rimuove (evita flash bianco su input/riga). */
export function commitSettingsListDelete(
  item: string | null | undefined,
  onRemove: (item: string) => void,
  close: () => void,
): void {
  if (!item) return;
  if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  close();
  onRemove(item);
}
