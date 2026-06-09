/** Target scrollLeft per centrare una colonna nel container (solo asse X). */
export function computeTimesheetColumnScrollLeft(
  scrollLeft: number,
  containerClientWidth: number,
  containerScrollWidth: number,
  columnLeftInViewport: number,
  columnWidth: number,
  containerLeftInViewport: number,
): number {
  const columnCenter = columnLeftInViewport + columnWidth / 2;
  const containerCenter = containerLeftInViewport + containerClientWidth / 2;
  const target = scrollLeft + (columnCenter - containerCenter);
  const maxScroll = Math.max(0, containerScrollWidth - containerClientWidth);
  return Math.min(maxScroll, Math.max(0, target));
}

/** Scroll orizzontale solo nel wrapper griglia — non propaga agli ancestor (es. main). */
export function scrollTimesheetColumnIntoView(
  container: HTMLElement,
  columnEl: HTMLElement,
  behavior: ScrollBehavior = "smooth",
): void {
  const nextLeft = computeTimesheetColumnScrollLeft(
    container.scrollLeft,
    container.clientWidth,
    container.scrollWidth,
    columnEl.getBoundingClientRect().left,
    columnEl.getBoundingClientRect().width,
    container.getBoundingClientRect().left,
  );
  if (Math.abs(nextLeft - container.scrollLeft) < 1) return;
  container.scrollTo({ left: nextLeft, behavior });
}
