/**
 * Flush commit pendenti dei combobox (`GlobalSelect`) prima del submit form.
 * Su iOS il tap su Salva spesso non esegue blur prima del submit: il testo digitato
 * resta in `searchText` locale finché non viene chiamato commitBlur.
 */

const comboboxFlushRegistry = new WeakMap<HTMLInputElement, () => void>();

export function registerGestionaleComboboxFlush(
  input: HTMLInputElement,
  flush: () => void,
): void {
  comboboxFlushRegistry.set(input, flush);
}

export function unregisterGestionaleComboboxFlush(input: HTMLInputElement): void {
  comboboxFlushRegistry.delete(input);
}

/** Esegue commit sincrono su tutti i combobox registrati nel subtree (form o modal root). */
export function flushGestionalePendingCommits(root: HTMLElement): void {
  const comboboxes = root.querySelectorAll<HTMLInputElement>('input[role="combobox"]');
  for (const input of comboboxes) {
    const flush = comboboxFlushRegistry.get(input);
    if (flush) flush();
  }
}

/** @deprecated Preferire `flushGestionalePendingCommits` — alias retrocompat per form submit. */
export function flushGestionaleFormPendingCommits(form: HTMLElement): void {
  flushGestionalePendingCommits(form);
}
