/** Colonna Kanban con contenuto più alto del viewport interno. */
export function columnHasVerticalOverflow(el: HTMLElement, epsilon = 1): boolean {
  return el.scrollHeight > el.clientHeight + epsilon;
}
