/** Colonna già interamente nel viewport del container (tolleranza 1px). */
export function isTimesheetColumnFullyVisible(
  container: HTMLElement,
  columnEl: HTMLElement,
): boolean {
  const cRect = container.getBoundingClientRect();
  const colRect = columnEl.getBoundingClientRect();
  return colRect.left >= cRect.left - 1 && colRect.right <= cRect.right + 1;
}

/** Target scrollLeft minimo per portare la colonna in vista (senza centrare). */
export function computeTimesheetColumnScrollLeft(
  scrollLeft: number,
  containerClientWidth: number,
  containerScrollWidth: number,
  columnLeftInViewport: number,
  columnWidth: number,
  containerLeftInViewport: number,
): number {
  const colLeft = columnLeftInViewport;
  const colRight = colLeft + columnWidth;
  const viewLeft = containerLeftInViewport;
  const viewRight = viewLeft + containerClientWidth;

  if (colLeft >= viewLeft && colRight <= viewRight) return scrollLeft;

  let target = scrollLeft;
  if (colLeft < viewLeft) {
    target = scrollLeft - (viewLeft - colLeft);
  } else if (colRight > viewRight) {
    target = scrollLeft + (colRight - viewRight);
  }

  const maxScroll = Math.max(0, containerScrollWidth - containerClientWidth);
  return Math.min(maxScroll, Math.max(0, target));
}

/** Scroll orizzontale solo nel wrapper griglia — non propaga agli ancestor (es. main). */
export function scrollTimesheetColumnIntoView(
  container: HTMLElement,
  columnEl: HTMLElement,
  behavior: ScrollBehavior = "auto",
): void {
  if (isTimesheetColumnFullyVisible(container, columnEl)) return;

  const colRect = columnEl.getBoundingClientRect();
  const nextLeft = computeTimesheetColumnScrollLeft(
    container.scrollLeft,
    container.clientWidth,
    container.scrollWidth,
    colRect.left,
    colRect.width,
    container.getBoundingClientRect().left,
  );
  if (Math.abs(nextLeft - container.scrollLeft) < 1) return;
  container.scrollTo({ left: nextLeft, behavior });
}
